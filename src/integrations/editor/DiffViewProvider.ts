import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import { createDirectoriesForFile } from "../../utils/fs"
import { arePathsEqual } from "../../utils/path"
import { formatResponse } from "../../core/prompts/responses"
import { DecorationController } from "./DecorationController"
import { diagnosticsToProblemsString, getNewDiagnostics } from "../diagnostics"
import * as diff from "diff" // Add this import statement

import { parsePatch, applyPatches } from "@sanity/diff-match-patch"

import { makeDiff, makePatches, stringifyPatches } from '@sanity/diff-match-patch'

export const DIFF_VIEW_URI_SCHEME = "cline-diff"

/**
 * DiffViewProvider class handles the diff view and user interactions
 * within the editor, including saving changes and updating the view.
 */
export class DiffViewProvider {
	editType?: "create" | "modify"
	isEditing = false
	originalContent: string | undefined
	private createdDirs: string[] = []
	private documentWasOpen = false
	private relPath?: string
	private newContent?: string
	private activeDiffEditor?: vscode.TextEditor
	private fadedOverlayController?: DecorationController
	private activeLineController?: DecorationController
	private streamedLines: string[] = []
	private preDiagnostics: [vscode.Uri, vscode.Diagnostic[]][] = []

	constructor(private cwd: string) {}

	async open(relPath: string): Promise<void> {
		this.relPath = relPath
		const fileExists = this.editType === "modify"
		const absolutePath = path.resolve(this.cwd, relPath)
		this.isEditing = true
		// if the file is already open, ensure it's not dirty before getting its contents
		if (fileExists) {
			const existingDocument = vscode.workspace.textDocuments.find((doc) =>
				arePathsEqual(doc.uri.fsPath, absolutePath)
			)
			if (existingDocument && existingDocument.isDirty) {
				await existingDocument.save()
			}
		}

		// get diagnostics before editing the file, we'll compare to diagnostics after editing to see if cline needs to fix anything
		this.preDiagnostics = vscode.languages.getDiagnostics()

		if (fileExists) {
			this.originalContent = await fs.readFile(absolutePath, "utf-8")
		} else {
			this.originalContent = ""
		}
		// for new files, create any necessary directories and keep track of new directories to delete if the user denies the operation
		this.createdDirs = await createDirectoriesForFile(absolutePath)
		// make sure the file exists before we open it
		if (!fileExists) {
			await fs.writeFile(absolutePath, "")
		}
		// if the file was already open, close it (must happen after showing the diff view since if it's the only tab the column will close)
		this.documentWasOpen = false
		// close the tab if it's open (it's already saved above)
		const tabs = vscode.window.tabGroups.all
			.map((tg) => tg.tabs)
			.flat()
			.filter(
				(tab) => tab.input instanceof vscode.TabInputText && arePathsEqual(tab.input.uri.fsPath, absolutePath)
			)
		for (const tab of tabs) {
			if (!tab.isDirty) {
				await vscode.window.tabGroups.close(tab)
			}
			this.documentWasOpen = true
		}
		this.activeDiffEditor = await this.openDiffEditor()
		this.fadedOverlayController = new DecorationController("fadedOverlay", this.activeDiffEditor)
		this.activeLineController = new DecorationController("activeLine", this.activeDiffEditor)
		// Apply faded overlay to all lines initially
		this.fadedOverlayController.addLines(0, this.activeDiffEditor.document.lineCount)
		this.scrollEditorToLine(0) // will this crash for new files?
		this.streamedLines = []
	}

	/**
	 * Updates the diff view with the accumulated content from the user.
	 * @param accumulatedContent - The content accumulated from user input.
	 * @param isFinal - A boolean indicating if this is the final update.
	 * @throws Will throw an error if required values are not set.
	 */
	async update(accumulatedContent: string, isFinal: boolean) {
		if (!this.relPath || !this.activeLineController || !this.fadedOverlayController) {
			throw new Error("Required values not set")
		}
		this.newContent = accumulatedContent
		const accumulatedLines = accumulatedContent.split("\n")
		if (!isFinal) {
			accumulatedLines.pop() // remove the last partial line only if it's not the final update
		}
		const diffLines = accumulatedLines.slice(this.streamedLines.length)

		const diffEditor = this.activeDiffEditor
		const document = diffEditor?.document
		if (!diffEditor || !document) {
			throw new Error("User closed text editor, unable to edit file...")
		}

		// Place cursor at the beginning of the diff editor to keep it out of the way of the stream animation
		const beginningOfDocument = new vscode.Position(0, 0)
		diffEditor.selection = new vscode.Selection(beginningOfDocument, beginningOfDocument)

		for (let i = 0; i < diffLines.length; i++) {
			const currentLine = this.streamedLines.length + i
			// Replace all content up to the current line with accumulated lines
			// This is necessary (as compared to inserting one line at a time) to handle cases where html tags on previous lines are auto closed for example
			const edit = new vscode.WorkspaceEdit()
			const rangeToReplace = new vscode.Range(0, 0, currentLine + 1, 0)
			const contentToReplace = accumulatedLines.slice(0, currentLine + 1).join("\n") + "\n"
			edit.replace(document.uri, rangeToReplace, contentToReplace)
			await vscode.workspace.applyEdit(edit)
			// Update decorations
			this.activeLineController.setActiveLine(currentLine)
			this.fadedOverlayController.updateOverlayAfterLine(currentLine, document.lineCount)
			// Scroll to the current line
			this.scrollEditorToLine(currentLine)
		}
		// Update the streamedLines with the new accumulated content
		this.streamedLines = accumulatedLines
		if (isFinal) {
			// Handle any remaining lines if the new content is shorter than the original
			if (this.streamedLines.length < document.lineCount) {
				const edit = new vscode.WorkspaceEdit()
				edit.delete(document.uri, new vscode.Range(this.streamedLines.length, 0, document.lineCount, 0))
				await vscode.workspace.applyEdit(edit)
			}
			// Add empty last line if original content had one
			const hasEmptyLastLine = this.originalContent?.endsWith("\n")
			if (hasEmptyLastLine) {
				const accumulatedLines = accumulatedContent.split("\n")
				if (accumulatedLines[accumulatedLines.length - 1] !== "") {
					accumulatedContent += "\n"
				}
			}
			// Clear all decorations at the end (before applying final edit)
			this.fadedOverlayController.clear()
			this.activeLineController.clear()
		}
	}

	/**
	 * Saves the changes made by the user and checks for new problems.
	 * @returns A promise that resolves to an object containing:
	 * - newProblemsMessage: A message indicating new problems detected.
	 * - userEdits: A string representing the user's edits in a pretty patch format.
	 * - finalContent: The final content after user edits.
	 */
	async saveChanges(): Promise<{
		newProblemsMessage: string | undefined
		userEdits: string | undefined
		finalContent: string | undefined
	}> {
		if (!this.relPath || !this.newContent || !this.activeDiffEditor) {
			return { newProblemsMessage: undefined, userEdits: undefined, finalContent: undefined }
		}
		const absolutePath = path.resolve(this.cwd, this.relPath)
		const updatedDocument = this.activeDiffEditor.document
		const editedContent = updatedDocument.getText()

		// Generate a diff between the original content and the edited content
		const diffs = makeDiff(this.originalContent ?? "", editedContent)

		// Create patches from the diff
		const patches = makePatches(this.originalContent ?? "", diffs)

		// Stringify the patches into a textual representation
		const patch = stringifyPatches(patches)

		// Apply the patch to the active text editor
		const { patchedCode, successfulPatches, failedPatches } = await applyPatchToCode(patch)

		if (failedPatches > 0) {
			vscode.window.showErrorMessage(`Failed to apply ${failedPatches} patch(es) to ${this.relPath}`)
			return { newProblemsMessage: undefined, userEdits: undefined, finalContent: undefined }
		}

		await vscode.window.showTextDocument(vscode.Uri.file(absolutePath), { preview: false })
		await this.closeAllDiffViews()

		const postDiagnostics = vscode.languages.getDiagnostics()
		const newProblems = diagnosticsToProblemsString(
			getNewDiagnostics(this.preDiagnostics, postDiagnostics),
			[
				vscode.DiagnosticSeverity.Error,
			],
			this.cwd
		)
		const newProblemsMessage =
			newProblems.length > 0 ? `\n\nNew problems detected after saving the file:\n${newProblems}` : ""

		return { newProblemsMessage, userEdits: patch, finalContent: patchedCode }
	}

	async revertChanges(): Promise<void> {
		if (!this.relPath || !this.activeDiffEditor) {
			return
		}
		const fileExists = this.editType === "modify"
		const updatedDocument = this.activeDiffEditor.document
		const absolutePath = path.resolve(this.cwd, this.relPath)
		if (!fileExists) {
			if (updatedDocument.isDirty) {
				await updatedDocument.save()
			}
			await this.closeAllDiffViews()
			await fs.unlink(absolutePath)
			// Remove only the directories we created, in reverse order
			for (let i = this.createdDirs.length - 1; i >= 0; i--) {
				await fs.rmdir(this.createdDirs[i])
				console.log(`Directory ${this.createdDirs[i]} has been deleted.`)
			}
			console.log(`File ${absolutePath} has been deleted.`)
		} else {
			// revert document
			const edit = new vscode.WorkspaceEdit()
			const fullRange = new vscode.Range(
				updatedDocument.positionAt(0),
				updatedDocument.positionAt(updatedDocument.getText().length)
			)
			edit.replace(updatedDocument.uri, fullRange, this.originalContent ?? "")
			// Apply the edit and save, since contents shouldnt have changed this wont show in local history unless of course the user made changes and saved during the edit
			await vscode.workspace.applyEdit(edit)
			await updatedDocument.save()
			console.log(`File ${absolutePath} has been reverted to its original content.`)
			if (this.documentWasOpen) {
				await vscode.window.showTextDocument(vscode.Uri.file(absolutePath), {
					preview: false,
				})
			}
			await this.closeAllDiffViews()
		}

		// edit is done
		await this.reset()
	}

	private async closeAllDiffViews() {
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff && tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME
			)
		for (const tab of tabs) {
			// trying to close dirty views results in save popup
			if (!tab.isDirty) {
				await vscode.window.tabGroups.close(tab)
			}
		}
	}

	private async openDiffEditor(): Promise<vscode.TextEditor> {
		if (!this.relPath) {
			throw new Error("No file path set")
		}
		const uri = vscode.Uri.file(path.resolve(this.cwd, this.relPath))
		// If this diff editor is already open (ie if a previous write file was interrupted) then we should activate that instead of opening a new diff
		const diffTab = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.find(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff &&
					tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME &&
					arePathsEqual(tab.input.modified.fsPath, uri.fsPath)
			)
		if (diffTab && diffTab.input instanceof vscode.TabInputTextDiff) {
			const editor = await vscode.window.showTextDocument(diffTab.input.modified)
			return editor
		}
		// Open new diff editor
		return new Promise<vscode.TextEditor>((resolve, reject) => {
			const fileName = path.basename(uri.fsPath)
			const fileExists = this.editType === "modify"
			const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
				if (editor && arePathsEqual(editor.document.uri.fsPath, uri.fsPath)) {
					disposable.dispose()
					resolve(editor)
				}
			})
			vscode.commands.executeCommand(
				"vscode.diff",
				vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${fileName}`).with({
					query: Buffer.from(this.originalContent ?? "").toString("base64"),
				}),
				uri,
				`${fileName}: ${fileExists ? "Original ↔ Cline's Changes" : "New File"} (Editable)`
			)
			// This may happen on very slow machines ie project idx
			setTimeout(() => {
				disposable.dispose()
				reject(new Error("Failed to open diff editor, please try again..."))
			}, 10_000)
		})
	}

	private scrollEditorToLine(line: number) {
		if (this.activeDiffEditor) {
			const scrollLine = line + 4
			this.activeDiffEditor.revealRange(
				new vscode.Range(scrollLine, 0, scrollLine, 0),
				vscode.TextEditorRevealType.InCenter
			)
		}
	}

	scrollToFirstDiff() {
		if (!this.activeDiffEditor) {
			return
		}
		const currentContent = this.activeDiffEditor.document.getText()
		const diffs = diff.diffLines(this.originalContent || "", currentContent)
		let lineCount = 0
		for (const part of diffs) {
			if (part.added || part.removed) {
				// Found the first diff, scroll to it
				this.activeDiffEditor.revealRange(
					new vscode.Range(lineCount, 0, lineCount, 0),
					vscode.TextEditorRevealType.InCenter
				)
				return
			}
			if (!part.removed) {
				lineCount += part.count || 0
			}
		}
	}

	// close editor if open?
	async reset() {
		this.editType = undefined
		this.isEditing = false
		this.originalContent = undefined
		this.createdDirs = []
		this.documentWasOpen = false
		this.activeDiffEditor = undefined
		this.fadedOverlayController = undefined
		this.activeLineController = undefined
		this.streamedLines = []
		this.preDiagnostics = []
	}
}
export async function applyPatchToCode(
	patchStr: string
): Promise<{ patchedCode: string; successfulPatches: number; failedPatches: number }> {
	const activeEditor = vscode.window.activeTextEditor
	if (!activeEditor) {
		vscode.window.showErrorMessage("No active text editor found.")
		return {
			patchedCode: "",
			successfulPatches: 0,
			failedPatches: 0,
		}
	}

	const originalCode = activeEditor.document.getText()

	try {
		// Parse the patch string into an array of Patch objects
		const patches = parsePatch(patchStr)

		// Apply the patches to the original code
		const [patchedCode, results] = applyPatches(patches, originalCode)

		// Analyze the patch application results
		const successfulPatches = results.filter((result) => result === true).length
		const failedPatches = results.length - successfulPatches

		// Create a WorkspaceEdit to update the active text editor
		const edit = new vscode.WorkspaceEdit()
		edit.replace(activeEditor.document.uri, new vscode.Range(0, 0, activeEditor.document.lineCount, 0), patchedCode)

		// Apply the edit to the active text editor
		await vscode.workspace.applyEdit(edit)

		// Save the document after applying the patch
		await activeEditor.document.save()

		return {
			patchedCode,
			successfulPatches,
			failedPatches,
		}
	} catch (error) {
		console.error("Error applying patch:", error)
		vscode.window.showErrorMessage("Failed to apply patch. Please check the console for details.")
		return {
			patchedCode: originalCode,
			successfulPatches: 0,
			failedPatches: 0,
		}
	}
}