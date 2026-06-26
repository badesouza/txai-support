import { Request, Response } from 'express';
import { ChamadoLocalRepository } from '../repositories';

export class ChamadoLocalController {
  /** List chamado locais with pagination. */
  static async listAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const result = await ChamadoLocalRepository.findMany({ page, limit, search });

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
      console.error('Error listing chamado locais:', error);
      res.status(500).json({ message: 'Error listing chamado locais' });
    }
  }

  /** Get chamado local by ID. */
  static async getById(req: Request, res: Response) {
    try {
      const item = await ChamadoLocalRepository.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Chamado local not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Error fetching chamado local:', error);
      res.status(500).json({ message: 'Error fetching chamado local' });
    }
  }

  /** Create a new chamado local. */
  static async create(req: Request, res: Response) {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        return res.status(400).json({ message: 'Nome é obrigatório' });
      }

      if (await ChamadoLocalRepository.nameExists(name)) {
        return res.status(400).json({ message: 'Já existe um local com este nome' });
      }

      const item = await ChamadoLocalRepository.create({ name });
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating chamado local:', error);
      res.status(500).json({ message: 'Error creating chamado local' });
    }
  }

  /** Update chamado local by ID. */
  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        return res.status(400).json({ message: 'Nome é obrigatório' });
      }

      if (await ChamadoLocalRepository.nameExists(name, id)) {
        return res.status(400).json({ message: 'Já existe um local com este nome' });
      }

      const item = await ChamadoLocalRepository.update(id, { name });
      if (!item) {
        return res.status(404).json({ message: 'Chamado local not found' });
      }

      res.json(item);
    } catch (error) {
      console.error('Error updating chamado local:', error);
      res.status(500).json({ message: 'Error updating chamado local' });
    }
  }

  /** Delete chamado local by ID. */
  static async delete(req: Request, res: Response) {
    try {
      const result = await ChamadoLocalRepository.delete(req.params.id);

      if (result.inUse) {
        return res.status(409).json({ message: 'Local vinculado a chamados e não pode ser excluído' });
      }
      if (!result.deleted) {
        return res.status(404).json({ message: 'Chamado local not found' });
      }

      res.json({ message: 'Chamado local deleted successfully' });
    } catch (error) {
      console.error('Error deleting chamado local:', error);
      res.status(500).json({ message: 'Error deleting chamado local' });
    }
  }
}
