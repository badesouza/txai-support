// src/controllers/CallController.ts
import { Request, Response } from "express";
import { CallService } from "../services/CallService";
import { CreateCallDto, UpdateCallDto } from "../dtos/call";
import { Call } from "../models/Call";
import { CallImage } from "../models/CallImage";
import { User } from "../models/User";
import { Op } from "sequelize";
import path from "path";
import fs from "fs";

// Extend Express Request type to include user
interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export class CallController {
  public static async index(req: Request, res: Response) {
    try {
      const calls = await Call.findAll({
        include: [
          {
            model: CallImage,
            as: "images",
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async show(req: Request, res: Response) {
    try {
      const call = await Call.findByPk(req.params.id, {
        include: [
          {
            model: CallImage,
            as: "images",
          },
        ],
      });

      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }

      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async store(req: AuthRequest, res: Response) {
    try {
      const { description, status } = req.body;
      const files = req.files as Express.Multer.File[];
      
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Criar o chamado
      const call = await Call.create({
        description,
        status,
        userName: req.user.name,
      });

      // Se houver imagens, salvá-las
      if (files && files.length > 0) {
        const uploadDir = path.join(__dirname, '../../uploads');
        
        // Criar diretório de uploads se não existir
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Processar cada imagem
        for (const file of files) {
          const fileName = `${Date.now()}-${file.originalname}`;
          const filePath = path.join(uploadDir, fileName);
          
          // Salvar o arquivo
          fs.writeFileSync(filePath, file.buffer);
          
          // Salvar a referência no banco
          await CallImage.create({
            call_id: call.id,
            image: `/uploads/${fileName}`
          });
        }
      }

      // Buscar o chamado com as imagens
      const callWithImages = await Call.findByPk(call.id, {
        include: [
          {
            model: CallImage,
            as: "images",
          },
        ],
      });

      res.status(201).json(callWithImages);
    } catch (error) {
      console.error("Error creating call:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async update(req: Request, res: Response) {
    try {
      const { description, status } = req.body;
      const call = await Call.findByPk(req.params.id);

      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }

      await call.update({
        description,
        status,
      });

      res.json(call);
    } catch (error) {
      console.error("Error updating call:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async destroy(req: Request, res: Response) {
    try {
      const call = await Call.findByPk(req.params.id, {
        include: [
          {
            model: CallImage,
            as: "images",
          },
        ],
      });

      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }

      // Excluir as imagens do sistema de arquivos
      for (const image of call.images) {
        const imagePath = path.join(__dirname, '../../', image.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await call.destroy();
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting call:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async deleteImage(req: Request, res: Response) {
    try {
      const { callId, imageId } = req.params;

      const image = await CallImage.findOne({
        where: {
          id: imageId,
          call_id: callId,
        },
      });

      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      // Excluir o arquivo do sistema
      const imagePath = path.join(__dirname, '../../', image.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      await image.destroy();
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
