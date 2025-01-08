import { describe, it, expect, beforeEach } from 'vitest';
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
      expect(state.instructions[0].isActive).toBe(true);
      expect(state.instructions[0].id).toMatch(/^instruction-\d+$/);
    });

    it('should generate unique IDs for multiple instructions', async () => {
      service.addInstruction({
        title: 'First Instruction',
        content: 'First content',
        isActive: true
      });

      service.addInstruction({
        title: 'Second Instruction',
        content: 'Second content',
        isActive: false
      });

      const state = await firstValueFrom(service.getInstructions());
      
      expect(state.instructions.length).toBe(2);
      expect(state.instructions[0].id).not.toBe(state.instructions[1].id);
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
        content: 'Updated content',
        isActive: false
      });

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.instructions[0].title).toBe('Updated Instruction');
      expect(updatedState.instructions[0].content).toBe('Updated content');
      expect(updatedState.instructions[0].isActive).toBe(false);
      expect(updatedState.instructions[0].updatedAt).toBeGreaterThanOrEqual(initialState.instructions[0].createdAt);
    });

    it('should not modify other instructions when updating', async () => {
      service.addInstruction({
        title: 'First Instruction',
        content: 'First content',
        isActive: true
      });

      service.addInstruction({
        title: 'Second Instruction',
        content: 'Second content',
        isActive: false
      });

      const initialState = await firstValueFrom(service.getInstructions());
      const firstInstructionId = initialState.instructions[0].id;

      service.updateInstruction(firstInstructionId, {
        title: 'Updated First Instruction'
      });

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.instructions[0].title).toBe('Updated First Instruction');
      expect(updatedState.instructions[1].title).toBe('Second Instruction');
    });
  });

  describe('Deleting Instructions', () => {
    it('should delete an existing instruction', async () => {
      service.addInstruction({
        title: 'Instruction to Delete',
        content: 'Delete me',
        isActive: true
      });

      const initialState = await firstValueFrom(service.getInstructions());
      const instructionId = initialState.instructions[0].id;

      service.deleteInstruction(instructionId);

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.instructions.length).toBe(0);
    });

    it('should not affect other instructions when deleting', async () => {
      service.addInstruction({
        title: 'First Instruction',
        content: 'First content',
        isActive: true
      });

      service.addInstruction({
        title: 'Second Instruction',
        content: 'Second content',
        isActive: false
      });

      const initialState = await firstValueFrom(service.getInstructions());
      const firstInstructionId = initialState.instructions[0].id;

      service.deleteInstruction(firstInstructionId);

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.instructions.length).toBe(1);
      expect(updatedState.instructions[0].title).toBe('Second Instruction');
    });
  });

  describe('Selecting Instructions', () => {
    it('should select an instruction', async () => {
      service.addInstruction({
        title: 'Instruction to Select',
        content: 'Select me',
        isActive: true
      });

      const initialState = await firstValueFrom(service.getInstructions());
      const instructionId = initialState.instructions[0].id;

      service.selectInstruction(instructionId);

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.selectedInstructionId).toBe(instructionId);
    });

    it('should change selected instruction', async () => {
      service.addInstruction({
        title: 'First Instruction',
        content: 'First content',
        isActive: true
      });

      service.addInstruction({
        title: 'Second Instruction',
        content: 'Second content',
        isActive: false
      });

      const initialState = await firstValueFrom(service.getInstructions());
      const firstInstructionId = initialState.instructions[0].id;
      const secondInstructionId = initialState.instructions[1].id;

      service.selectInstruction(firstInstructionId);
      service.selectInstruction(secondInstructionId);

      const updatedState = await firstValueFrom(service.getInstructions());
      
      expect(updatedState.selectedInstructionId).toBe(secondInstructionId);
    });
  });

  describe('Instruction Validation', () => {
    it('should validate instruction with title and content', () => {
      const validInstruction = {
        title: 'Valid Instruction',
        content: 'Valid content',
        isActive: true
      };

      const invalidInstructionNoTitle = {
        title: '',
        content: 'Some content',
        isActive: true
      };

      const invalidInstructionNoContent = {
        title: 'Some Title',
        content: '',
        isActive: true
      };

      expect(service.validateInstruction(validInstruction)).toBe(true);
      expect(service.validateInstruction(invalidInstructionNoTitle)).toBe(false);
      expect(service.validateInstruction(invalidInstructionNoContent)).toBe(false);
    });
  });
}); 