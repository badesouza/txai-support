// src/controllers/CallController.ts
import { Request, Response } from "express";
import { storage } from '../storage/storage';
import { CallRepository, CallStatusHistoryRepository, UserRepository } from '../repositories';
import { CallImage } from '../types/models';

export class CallController {
  private static async hydrateImages<T extends { images?: Array<{ path: string }> }>(item: T): Promise<T> {
    if (!item.images || item.images.length === 0) {
      return item;
    }

    const images = await Promise.all(
      item.images.map(async (image) => ({
        ...image,
        path: await storage.getFileUrl(image.path),
      }))
    );

    return {
      ...item,
      images,
    };
  }

  static async listAllCalls(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      console.log('Search request:', { search, page, limit });

      const result = await CallRepository.findMany({
        page,
        limit,
        orderBy: 'createdAt',
        orderDirection: 'desc',
        search
      });

      // Debug logs
      console.log('Calls with images:', result.data.map(call => ({
        id: call.id,
        title: call.title,
        imagesCount: call.images?.length,
        images: call.images
      })));

      // Hydrate images with URLs and add user info
      const callsWithUrls = await Promise.all(result.data.map(async (call) => {
        const hydratedCall = await CallController.hydrateImages(call);
        
        // Get user info if available
        let user = null;
        if (call.userId) {
          const userDoc = await UserRepository.findById(call.userId);
          if (userDoc) {
            user = {
              id: userDoc.id,
              name: userDoc.name,
              email: userDoc.email,
              phone: userDoc.phone
            };
          }
        }

        return {
          ...hydratedCall,
          user
        };
      }));

      res.json({
        calls: callsWithUrls,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Error listing calls:', error);
      res.status(500).json({ message: 'Error listing calls', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  static async getCallById(req: Request, res: Response) {
    try {
      const callId = req.params.id;
      if (!callId) {
        return res.status(400).json({ message: 'Invalid call ID' });
      }

      const call = await CallRepository.findByIdWithImages(callId);

      if (!call) {
        return res.status(404).json({ message: 'Call not found' });
      }

      // Get user info
      let user = null;
      if (call.userId) {
        const userDoc = await UserRepository.findById(call.userId);
        if (userDoc) {
          user = {
            id: userDoc.id,
            name: userDoc.name,
            email: userDoc.email,
            phone: userDoc.phone
          };
        }
      }

      const callWithUrls = await CallController.hydrateImages(call);
      res.json({ ...callWithUrls, user });
    } catch (error) {
      console.error('Error fetching call:', error);
      res.status(500).json({ message: 'Error fetching call' });
    }
  }

  static async createCall(req: Request, res: Response) {
    try {
      console.log('=== CREATE CALL ===');
      console.log('Request files:', req.files);
      console.log('Request body:', req.body);

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { title, description, status, priority } = req.body;

      // Validar campos obrigatórios
      if (!title || !description) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          required: ['title', 'description']
        });
      }

      // Converter status e priority para maiúsculo
      const formattedStatus = status ? status.toUpperCase() : 'OPEN';
      const formattedPriority = priority ? priority.toUpperCase() : 'MEDIUM';

      // Validar valores dos enums
      if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(formattedStatus)) {
        return res.status(400).json({ 
          message: 'Invalid status',
          validStatuses: ['OPEN', 'IN_PROGRESS', 'CLOSED']
        });
      }

      if (!['LOW', 'MEDIUM', 'HIGH'].includes(formattedPriority)) {
        return res.status(400).json({ 
          message: 'Invalid priority',
          validPriorities: ['LOW', 'MEDIUM', 'HIGH']
        });
      }

      // Get user info for denormalization
      const user = await UserRepository.findById(String(userId));

      console.log('Criando chamado com dados:', {
        title,
        description,
        status: formattedStatus,
        priority: formattedPriority,
        userId,
        files: req.files
      });

      // Criar o chamado
      const call = await CallRepository.create({
        title,
        description,
        status: formattedStatus,
        priority: formattedPriority,
        userId: String(userId),
        userName: user?.name,
        userEmail: user?.email,
        userPhone: user?.phone
      });

      // Add images if present
      const images: CallImage[] = [];
      if (Array.isArray(req.files) && req.files.length > 0) {
        for (const file of req.files as Express.Multer.File[]) {
          console.log('Criando imagem:', file);
          const image = await CallRepository.addImage({
            callId: call.id,
            filename: file.filename,
            path: file.path
          });
          images.push(image);
        }
      }

      console.log('Chamado criado:', call);

      const callWithImages = { ...call, images };
      const callWithUrls = await CallController.hydrateImages(callWithImages);
      
      res.status(201).json({
        ...callWithUrls,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        } : null
      });
    } catch (error) {
      console.error('Error creating call:', error);
      res.status(500).json({ 
        message: 'Error creating call',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async updateCall(req: Request, res: Response) {
    try {
      const callId = req.params.id;
      const { title, description, status, priority } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Buscar o chamado atual para obter o status anterior
      const currentCall = await CallRepository.findById(callId);

      if (!currentCall) {
        return res.status(404).json({ message: 'Call not found' });
      }

      // Atualizar o chamado
      const updatedCall = await CallRepository.update(callId, {
        title,
        description,
        status,
        priority
      });

      if (!updatedCall) {
        return res.status(404).json({ message: 'Call not found' });
      }

      // Adicionar novas imagens se houver
      if (Array.isArray(req.files) && req.files.length > 0) {
        for (const file of req.files as Express.Multer.File[]) {
          await CallRepository.addImage({
            callId: callId,
            filename: file.filename,
            path: file.path
          });
        }
      }

      // Se o status foi alterado, registrar no histórico
      if (status && status !== currentCall.status) {
        const user = await UserRepository.findById(String(userId));
        await CallStatusHistoryRepository.create({
          callId: callId,
          oldStatus: currentCall.status,
          newStatus: status,
          userId: String(userId),
          userName: user?.name
        });
      }

      // Get updated call with images
      const callWithImages = await CallRepository.findByIdWithImages(callId);
      
      // Get user info
      let user = null;
      if (updatedCall.userId) {
        const userDoc = await UserRepository.findById(updatedCall.userId);
        if (userDoc) {
          user = {
            id: userDoc.id,
            name: userDoc.name,
            email: userDoc.email,
            phone: userDoc.phone
          };
        }
      }

      const updatedCallWithUrls = await CallController.hydrateImages(callWithImages!);
      res.json({ ...updatedCallWithUrls, user });
    } catch (error) {
      console.error('Error updating call:', error);
      res.status(500).json({ message: 'Error updating call' });
    }
  }

  static async deleteCall(req: Request, res: Response) {
    try {
      const callId = req.params.id;
      if (!callId) {
        return res.status(400).json({ message: 'Invalid call ID' });
      }

      // Delete status history
      await CallStatusHistoryRepository.deleteByCallId(callId);

      // Delete the call (this also deletes images)
      const deleted = await CallRepository.delete(callId);

      if (!deleted) {
        return res.status(404).json({ message: 'Call not found' });
      }

      res.json({ message: 'Call deleted successfully' });
    } catch (error) {
      console.error('Error deleting call:', error);
      res.status(500).json({ 
        message: 'Error deleting call',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getCallStatistics(req: Request, res: Response) {
    try {
      const { dateStart, dateEnd, status } = req.query;
      
      // For Firestore, we need to query differently
      // Get all calls and filter/group in memory
      const result = await CallRepository.findMany({
        page: 1,
        limit: 10000, // Get all for statistics
      });

      let filteredCalls = result.data;

      // Filter by date range
      if (dateStart && dateEnd) {
        const startDate = new Date(`${dateStart}T00:00:00.000Z`);
        const endDate = new Date(`${dateEnd}T23:59:59.999Z`);
        
        filteredCalls = filteredCalls.filter(call => {
          const callDate = new Date(call.createdAt);
          return callDate >= startDate && callDate <= endDate;
        });
      }
      
      // Filter by status
      if (status && status !== 'ALL') {
        filteredCalls = filteredCalls.filter(call => call.status === status);
      }

      // Group by status
      const statusCounts: { [key: string]: number } = {};
      filteredCalls.forEach(call => {
        statusCounts[call.status] = (statusCounts[call.status] || 0) + 1;
      });

      // Format data for chart
      const labels = Object.keys(statusCounts);
      const data = Object.values(statusCounts);

      res.json({
        labels,
        datasets: [{
          label: 'Chamados',
          data,
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        }],
      });
    } catch (error) {
      console.error('Error getting call statistics:', error);
      res.status(500).json({ 
        message: 'Error getting call statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async deleteCallImage(req: Request, res: Response) {
    try {
      const callId = req.params.callId;
      const imageId = req.params.imageId;

      if (!callId || !imageId) {
        return res.status(400).json({ message: 'Invalid call ID or image ID' });
      }

      const image = await CallRepository.findImageById(imageId);

      if (!image || image.callId !== callId) {
        return res.status(404).json({ message: 'Image not found' });
      }

      await CallRepository.deleteImage(imageId);

      try {
        await storage.deleteFile(image.path);
      } catch (deleteError) {
        console.warn('Error deleting image file:', deleteError);
      }

      res.json({ message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Error deleting call image:', error);
      res.status(500).json({ 
        message: 'Error deleting call image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
