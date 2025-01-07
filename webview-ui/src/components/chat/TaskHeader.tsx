import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React, { memo, useEffect, useMemo, useRef, useState } from "react"
import { useWindowSize } from "react-use"
import { mentionRegexGlobal } from "../../../../src/shared/context-mentions"
import { ClineMessage } from "../../../../src/shared/ExtensionMessage"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { formatLargeNumber } from "../../utils/format"
import { formatSize } from "../../utils/size"
import { vscode } from "../../utils/vscode"
import Thumbnails from "../common/Thumbnails"

interface TaskHeaderProps {
	task: ClineMessage
	tokensIn: number
	tokensOut: number
	doesModelSupportPromptCache: boolean
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
	onClose: () => void
}

const TaskHeader: React.FC<TaskHeaderProps> = memo(({
	task,
	tokensIn,
	tokensOut,
	doesModelSupportPromptCache,
	cacheWrites,
	cacheReads,
	totalCost,
	onClose,
}) => {
	const [isTaskExpanded, setIsTaskExpanded] = useState(true)
	const [isTextExpanded, setIsTextExpanded] = useState(false)
	const [showSeeMore, setShowSeeMore] = useState(false)
	const textRef = useRef<HTMLDivElement>(null)
	const textContainerRef = useRef<HTMLDivElement>(null)
	const { width } = useWindowSize()
	const { apiConfiguration, currentTaskItem, checkpointTrackerErrorMessage } = useExtensionState()

	// Check if text needs "See more" button
	useEffect(() => {
		if (textRef.current && textContainerRef.current) {
			const isOverflowing = textRef.current.scrollHeight > textContainerRef.current.clientHeight
			setShowSeeMore(isOverflowing)
		}
	}, [width, isTaskExpanded])

	const highlightMentions = (text: string, isMarkdown: boolean) => {
		return text.split(mentionRegexGlobal).map((part, index) => {
			if (part.match(mentionRegexGlobal)) {
				return (
					<span
						key={index}
						style={{
							backgroundColor: "var(--vscode-editor-findMatchHighlightBackground)",
							borderRadius: "3px",
							padding: "0 2px",
						}}>
						{part}
					</span>
				)
			}
			return part
		})
	}

	const isCostAvailable = useMemo(() => {
		return (
			apiConfiguration?.apiProvider !== "openai" &&
			apiConfiguration?.apiProvider !== "ollama" &&
			apiConfiguration?.apiProvider !== "lmstudio" &&
			apiConfiguration?.apiProvider !== "gemini"
		)
	}, [apiConfiguration?.apiProvider])

	const shouldShowPromptCacheInfo = doesModelSupportPromptCache && apiConfiguration?.apiProvider !== "openrouter"

	const DeleteButton = memo(({ taskSize, taskId }: { taskSize?: string; taskId?: string }) => {
		if (!taskId) return null
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					cursor: "pointer",
					color: "var(--vscode-errorForeground)",
					fontSize: "11px",
				}}
				onClick={() => {
					if (taskId) {
						vscode.postMessage({
							command: "deleteTask",
							taskId,
						})
					}
				}}>
				<span>{taskSize}</span>
				<i className="codicon codicon-trash" />
			</div>
		)
	})

	return (
		<div style={{ padding: "10px 13px 10px 13px" }}>
			<div
				style={{
					backgroundColor: "var(--vscode-badge-background)",
					color: "var(--vscode-badge-foreground)",
					borderRadius: "3px",
					padding: "9px 10px 9px 14px",
					display: "flex",
					flexDirection: "column",
					gap: 6,
					position: "relative",
					zIndex: 1,
				}}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							cursor: "pointer",
							marginLeft: -2,
							userSelect: "none",
							WebkitUserSelect: "none",
							MozUserSelect: "none",
							msUserSelect: "none",
							flexGrow: 1,
							minWidth: 0,
						}}
						onClick={() => setIsTaskExpanded(!isTaskExpanded)}
						role="button"
						tabIndex={0}
						aria-expanded={isTaskExpanded}
						onKeyPress={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								setIsTaskExpanded(!isTaskExpanded)
							}
						}}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								flexShrink: 0,
								}}>
							<span 
								className={`codicon codicon-chevron-${isTaskExpanded ? "down" : "right"}`}
								aria-hidden="true"
							/>
						</div>
						<div
							style={{
								marginLeft: 6,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								flexGrow: 1,
								minWidth: 0,
							}}>
							<span style={{ fontWeight: "bold" }}>Task{!isTaskExpanded && ":"}</span>
							{!isTaskExpanded && (
								<span style={{ marginLeft: 4 }}>
									{highlightMentions(task.text, false)}
								</span>
							)}
						</div>
					</div>
					{!isTaskExpanded && isCostAvailable && (
						<div
							style={{
								marginLeft: 10,
								backgroundColor: "color-mix(in srgb, var(--vscode-badge-foreground) 70%, transparent)",
								color: "var(--vscode-badge-background)",
								padding: "2px 4px",
								borderRadius: "500px",
								fontSize: "11px",
								fontWeight: 500,
								display: "inline-block",
								flexShrink: 0,
							}}
							role="status"
							aria-label={`Cost: $${totalCost?.toFixed(4)}`}>
							${totalCost?.toFixed(4)}
						</div>
					)}
					<VSCodeButton 
						appearance="icon" 
						onClick={onClose} 
						style={{ marginLeft: 6, flexShrink: 0 }}
						aria-label="Close task">
						<span className="codicon codicon-close" />
					</VSCodeButton>
				</div>
				{isTaskExpanded && (
					<>
						<div
							ref={textContainerRef}
							style={{
								marginTop: -2,
								fontSize: "var(--vscode-font-size)",
								overflowY: isTextExpanded ? "auto" : "hidden",
								wordBreak: "break-word",
								overflowWrap: "anywhere",
								position: "relative",
							}}>
							<div
								ref={textRef}
								style={{
									display: "-webkit-box",
									WebkitLineClamp: isTextExpanded ? "unset" : 3,
									WebkitBoxOrient: "vertical",
									overflow: "hidden",
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									overflowWrap: "anywhere",
								}}>
								{highlightMentions(task.text, false)}
							</div>
							{!isTextExpanded && showSeeMore && (
								<div
									style={{
										position: "absolute",
										right: 0,
										bottom: 0,
										display: "flex",
										alignItems: "center",
									}}>
									<div
										style={{
											width: 30,
											height: "1.2em",
											background: "linear-gradient(to right, transparent, var(--vscode-badge-background))",
										}}
									/>
									<div
										style={{
											cursor: "pointer",
											color: "var(--vscode-textLink-foreground)",
											paddingRight: 0,
											paddingLeft: 3,
											backgroundColor: "var(--vscode-badge-background)",
										}}
										onClick={() => setIsTextExpanded(!isTextExpanded)}
										role="button"
										tabIndex={0}
										onKeyPress={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												setIsTextExpanded(!isTextExpanded)
											}
										}}>
										See more
									</div>
								</div>
							)}
						</div>
						{isTextExpanded && showSeeMore && (
							<div
								style={{
									cursor: "pointer",
									color: "var(--vscode-textLink-foreground)",
									marginLeft: "auto",
									textAlign: "right",
									paddingRight: 2,
								}}
								onClick={() => setIsTextExpanded(!isTextExpanded)}
								role="button"
								tabIndex={0}
								onKeyPress={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										setIsTextExpanded(!isTextExpanded)
									}
								}}>
								See less
							</div>
						)}
						{task.images && task.images.length > 0 && <Thumbnails images={task.images} />}
						<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "4px",
										flexWrap: "wrap",
									}}>
									<span style={{ fontWeight: "bold" }}>Tokens:</span>
									<span
										style={{
											display: "flex",
											alignItems: "center",
											gap: "3px",
										}}
										role="status"
										aria-label={`Input tokens: ${formatLargeNumber(tokensIn || 0)}`}>
										<i
											className="codicon codicon-arrow-up"
											style={{
												fontSize: "12px",
												fontWeight: "bold",
												marginBottom: "-2px",
											}}
											aria-hidden="true"
										/>
										{formatLargeNumber(tokensIn || 0)}
									</span>
									<span
										style={{
											display: "flex",
											alignItems: "center",
											gap: "3px",
										}}
										role="status"
										aria-label={`Output tokens: ${formatLargeNumber(tokensOut || 0)}`}>
										<i
											className="codicon codicon-arrow-down"
											style={{
												fontSize: "12px",
												fontWeight: "bold",
												marginBottom: "-2px",
											}}
											aria-hidden="true"
										/>
										{formatLargeNumber(tokensOut || 0)}
									</span>
								</div>
								{!isCostAvailable && (
									<DeleteButton taskSize={formatSize(currentTaskItem?.size)} taskId={currentTaskItem?.id} />
								)}
							</div>

							{shouldShowPromptCacheInfo && (cacheReads !== undefined || cacheWrites !== undefined) && (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "4px",
										flexWrap: "wrap",
									}}>
									<span style={{ fontWeight: "bold" }}>Cache:</span>
									<span
										style={{
											display: "flex",
											alignItems: "center",
											gap: "3px",
										}}
										role="status"
										aria-label={`Cache writes: ${formatLargeNumber(cacheWrites || 0)}`}>
										<i
											className="codicon codicon-database"
											style={{
												fontSize: "12px",
												fontWeight: "bold",
												marginBottom: "-1px",
											}}
											aria-hidden="true"
										/>
										+{formatLargeNumber(cacheWrites || 0)}
									</span>
									<span
										style={{
											display: "flex",
											alignItems: "center",
											gap: "3px",
										}}
										role="status"
										aria-label={`Cache reads: ${formatLargeNumber(cacheReads || 0)}`}>
										<i
											className="codicon codicon-arrow-right"
											style={{
												fontSize: "12px",
												fontWeight: "bold",
												marginBottom: 0,
											}}
											aria-hidden="true"
										/>
										{formatLargeNumber(cacheReads || 0)}
									</span>
								</div>
							)}
							{isCostAvailable && (
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "4px",
										}}>
										<span style={{ fontWeight: "bold" }}>API Cost:</span>
										<span role="status" aria-label={`API Cost: $${totalCost?.toFixed(4)}`}>
											${totalCost?.toFixed(4)}
										</span>
									</div>
									<DeleteButton taskSize={formatSize(currentTaskItem?.size)} taskId={currentTaskItem?.id} />
								</div>
								)}
								{checkpointTrackerErrorMessage && (
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											color: "var(--vscode-editorWarning-foreground)",
											fontSize: "11px",
										}}
										role="alert">
										<i className="codicon codicon-warning" aria-hidden="true" />
										<span>
											{checkpointTrackerErrorMessage}
											{checkpointTrackerErrorMessage.includes("Git must be installed to use checkpoints.") && (
												<>
													{" "}
													<a
														href="https://github.com/cline/cline/wiki/Installing-Git-for-Checkpoints"
														style={{
															color: "inherit",
															textDecoration: "underline",
														}}>
														See here for instructions.
													</a>
												</>
											)}
										</span>
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		)
	})

	TaskHeader.displayName = "TaskHeader"

	export default TaskHeader
