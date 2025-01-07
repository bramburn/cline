import { CustomInstructionsService } from '../CustomInstructionsService';
import { firstValueFrom } from 'rxjs';

describe('CustomInstructionsService', () => {
  let service: CustomInstructionsService;

  beforeEach(() => {
    service = new CustomInstructionsService();
  });

  describe('Adding Instructions', () => {
    it('should add a new instruction', async () => {
      service.addInstruction({
        title: 'Test Instruction',
        content: 'This is a test instruction',
        isActive: true
      });

      const state = await firstValueFrom(service.getInstructions());
      
      expect(state.instructions.length).toBe(1);
      expect(state.instructions[0].title).toBe('Test Instruction');
      expect(state.instructions[0].content).toBe('This is a test instruction');
    });
  });

  describe('Updating Instructions', () => {
    it('should update an existing instruction', async () => {
      service.addInstruction({
        title: 'Original Instruction',
        content: 'Original content',
        isActive: true
      });

      const initialState = await firstValueFrom(service.getInstructions());
      const instructionId = initialState.instructions[0].id;

      service.updateInstruction(instructionId, {
        title: 'Updated Instruction',
        content: 'Updated content'
      });

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.instructions[0].title).toBe('Updated Instruction');
      expect(updatedState.instructions[0].content).toBe('Updated content');
      expect(updatedState.instructions[0].updatedAt).toBeGreaterThan(initialState.instructions[0].createdAt);
    });
  });

  describe('Deleting Instructions', () => {
    it('should delete an instruction', async () => {
      service.addInstruction({
        title: 'Instruction to Delete',
        content: 'This will be deleted',
        isActive: true
      });

      const initialState = await firstValueFrom(service.getInstructions());
      const instructionId = initialState.instructions[0].id;

      service.deleteInstruction(instructionId);

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.instructions.length).toBe(0);
    });
  });

  describe('Selecting Instructions', () => {
    it('should select an instruction', async () => {
      service.addInstruction({
        title: 'Selectable Instruction',
        content: 'This can be selected',
        isActive: true
      });

      const initialState = await firstValueFrom(service.getInstructions());
      const instructionId = initialState.instructions[0].id;

      service.selectInstruction(instructionId);

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.selectedInstructionId).toBe(instructionId);
    });
  });

  describe('Instruction Validation', () => {
    it('should validate instructions', () => {
      expect(service.validateInstruction({
        title: 'Valid Title',
        content: 'Valid Content'
      })).toBe(true);

      expect(service.validateInstruction({
        title: '',
        content: ''
      })).toBe(false);

      expect(service.validateInstruction({
        title: 'Title',
        content: ''
      })).toBe(false);
    });
  });
}); 