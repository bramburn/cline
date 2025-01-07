import { injectable } from 'inversify';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CustomInstruction {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CustomInstructionsState {
  instructions: CustomInstruction[];
  selectedInstructionId?: string;
}

@injectable()
export class CustomInstructionsService {
  private instructionsSubject = new BehaviorSubject<CustomInstructionsState>({
    instructions: []
  });

  public getInstructions(): Observable<CustomInstructionsState> {
    return this.instructionsSubject.asObservable();
  }

  public addInstruction(instruction: Omit<CustomInstruction, 'id' | 'createdAt' | 'updatedAt'>): void {
    const timestamp = Date.now();
    const newInstruction: CustomInstruction = {
      id: `instruction-${timestamp}`,
      ...instruction,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const currentState = this.instructionsSubject.value;
    this.instructionsSubject.next({
      ...currentState,
      instructions: [...currentState.instructions, newInstruction]
    });
  }

  public updateInstruction(id: string, updates: Partial<Omit<CustomInstruction, 'id' | 'createdAt'>>): void {
    const currentState = this.instructionsSubject.value;
    const updatedInstructions = currentState.instructions.map(instruction => 
      instruction.id === id 
        ? { 
            ...instruction, 
            ...updates, 
            updatedAt: Date.now() 
          } 
        : instruction
    );

    this.instructionsSubject.next({
      ...currentState,
      instructions: updatedInstructions
    });
  }

  public deleteInstruction(id: string): void {
    const currentState = this.instructionsSubject.value;
    const filteredInstructions = currentState.instructions.filter(instruction => instruction.id !== id);

    this.instructionsSubject.next({
      ...currentState,
      instructions: filteredInstructions,
      selectedInstructionId: currentState.selectedInstructionId === id ? undefined : currentState.selectedInstructionId
    });
  }

  public selectInstruction(id: string): void {
    const currentState = this.instructionsSubject.value;
    this.instructionsSubject.next({
      ...currentState,
      selectedInstructionId: id
    });
  }

  public validateInstruction(instruction: Partial<CustomInstruction>): boolean {
    // Basic validation
    return !!(instruction.title && instruction.title.trim().length > 0 && 
              instruction.content && instruction.content.trim().length > 0);
  }
} 