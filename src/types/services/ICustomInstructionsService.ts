import { Observable } from 'rxjs';
import { CustomInstruction, CustomInstructionsState } from '../../services/CustomInstructionsService';

export interface ICustomInstructionsService {
  getInstructions(): Observable<CustomInstructionsState>;
  addInstruction(instruction: Omit<CustomInstruction, 'id' | 'createdAt' | 'updatedAt'>): void;
  updateInstruction(id: string, updates: Partial<Omit<CustomInstruction, 'id' | 'createdAt'>>): void;
  deleteInstruction(id: string): void;
  selectInstruction(id: string): void;
  validateInstruction(instruction: Partial<CustomInstruction>): boolean;
} 