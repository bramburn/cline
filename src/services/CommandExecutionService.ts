import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';

export interface CommandExecutionResult {
  stdout: string[];
  stderr: string[];
  exitCode: number | null;
}

export class CommandExecutionService {
  private runningProcess: ChildProcessWithoutNullStreams | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();

  executeCommand(command: string, args: string[] = []): Promise<CommandExecutionResult> {
    return new Promise((resolve, reject) => {
      const stdout: string[] = [];
      const stderr: string[] = [];

      this.runningProcess = spawn(command, args, { shell: true });

      this.runningProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        stdout.push(output);
        this.eventEmitter.emit('output', { type: 'stdout', data: output });
      });

      this.runningProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        stderr.push(output);
        this.eventEmitter.emit('output', { type: 'stderr', data: output });
      });

      this.runningProcess.on('close', (code) => {
        this.runningProcess = null;
        resolve({
          stdout,
          stderr,
          exitCode: code
        });
      });

      this.runningProcess.on('error', (error) => {
        this.runningProcess = null;
        reject(error);
      });
    });
  }

  interruptCommand(): boolean {
    if (this.runningProcess) {
      this.runningProcess.kill('SIGINT');
      this.runningProcess = null;
      return true;
    }
    return false;
  }

  onOutput(callback: (output: { type: 'stdout' | 'stderr', data: string }) => void) {
    this.eventEmitter.on('output', callback);
  }

  removeOutputListener(callback: (output: { type: 'stdout' | 'stderr', data: string }) => void) {
    this.eventEmitter.removeListener('output', callback);
  }
} 