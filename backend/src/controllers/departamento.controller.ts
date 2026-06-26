import { Request, Response } from 'express';
import { DepartamentoRepository } from '../repositories';

export class DepartamentoController {
  /** List departamentos with pagination. */
  static async listAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const result = await DepartamentoRepository.findMany({ page, limit, search });

      res.json({
        items: result.data,
        pagination: {
          total: result.total,
          totalPages: result.totalPages,
          currentPage: result.page,
          limit: result.limit,
        },
      });
    } catch (error) {
      console.error('Error listing departamentos:', error);
      res.status(500).json({ message: 'Error listing departamentos' });
    }
  }

  /** Get departamento by ID. */
  static async getById(req: Request, res: Response) {
    try {
      const item = await DepartamentoRepository.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Departamento not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Error fetching departamento:', error);
      res.status(500).json({ message: 'Error fetching departamento' });
    }
  }

  /** Create a new departamento. */
  static async create(req: Request, res: Response) {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        return res.status(400).json({ message: 'Nome é obrigatório' });
      }

      if (await DepartamentoRepository.nameExists(name)) {
        return res.status(400).json({ message: 'Já existe um departamento com este nome' });
      }

      const item = await DepartamentoRepository.create({ name });
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating departamento:', error);
      res.status(500).json({ message: 'Error creating departamento' });
    }
  }

  /** Update departamento by ID. */
  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        return res.status(400).json({ message: 'Nome é obrigatório' });
      }

      if (await DepartamentoRepository.nameExists(name, id)) {
        return res.status(400).json({ message: 'Já existe um departamento com este nome' });
      }

      const item = await DepartamentoRepository.update(id, { name });
      if (!item) {
        return res.status(404).json({ message: 'Departamento not found' });
      }

      res.json(item);
    } catch (error) {
      console.error('Error updating departamento:', error);
      res.status(500).json({ message: 'Error updating departamento' });
    }
  }

  /** Delete departamento by ID. */
  static async delete(req: Request, res: Response) {
    try {
      const result = await DepartamentoRepository.delete(req.params.id);

      if (result.inUse) {
        return res.status(409).json({ message: 'Departamento vinculado a chamados e não pode ser excluído' });
      }
      if (!result.deleted) {
        return res.status(404).json({ message: 'Departamento not found' });
      }

      res.json({ message: 'Departamento deleted successfully' });
    } catch (error) {
      console.error('Error deleting departamento:', error);
      res.status(500).json({ message: 'Error deleting departamento' });
    }
  }
}
