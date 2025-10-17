// @ts-expect-error: MSW types are not installed; runtime import works for tests
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/api/users/login', async ({ request }: any) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'admin@txai.com' && body.password === 'admin123') {
      return HttpResponse.json({
        user: {
          id: 1,
          name: 'Admin User',
          email: 'admin@txai.com',
          profile: 'ADMIN'
        },
        token: 'mock-jwt-token'
      });
    }
    
    return HttpResponse.json(
      { message: 'Credenciais inválidas' },
      { status: 401 }
    );
  }),

  // WhatsApp endpoints
  http.get('/api/whatsapp/status', () => {
    return HttpResponse.json({
      connected: false,
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    });
  }),

  http.post('/api/whatsapp/initialize', () => {
    return HttpResponse.json({ message: 'WhatsApp initialization started' });
  }),

  http.post('/api/whatsapp/disconnect', () => {
    return HttpResponse.json({ message: 'WhatsApp disconnected successfully' });
  }),

  http.post('/api/whatsapp/reconnect', () => {
    return HttpResponse.json({ message: 'WhatsApp reconnection started' });
  }),

  // Users endpoints
  http.get('/api/users', ({ request }: any) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';

    const allUsers = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        profile: 'USER',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '987654321',
        profile: 'ADMIN',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 3,
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '555555555',
        profile: 'USER',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ];

    let filteredUsers = allUsers;
    if (search) {
      filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.phone.includes(search)
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const users = filteredUsers.slice(startIndex, endIndex);
    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / limit);

    return HttpResponse.json({ users, total, totalPages });
  }),

  http.get('/api/users/:id', ({ params }: any) => {
    const { id } = params;
    
    const user = {
      id: parseInt(id as string),
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
      profile: 'USER',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    return HttpResponse.json(user);
  }),

  http.post('/api/users', async ({ request }: any) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: 4,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { status: 201 });
  }),

  http.put('/api/users/:id', async ({ params, request }: any) => {
    const { id } = params;
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: parseInt(id as string),
      ...body,
      updatedAt: new Date().toISOString()
    });
  }),

  http.delete('/api/users/:id', ({ params }: any) => {
    return HttpResponse.json({ message: 'Usuário deletado com sucesso' });
  }),

  // Calls endpoints
  http.get('/api/calls', () => {
    return HttpResponse.json({
      calls: [
        {
          id: 1,
          title: 'Problema com sistema',
          description: 'Sistema não está funcionando corretamente',
          status: 'OPEN',
          priority: 'HIGH',
          userId: 1,
          user: {
            name: 'John Doe',
            email: 'john@example.com'
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      total: 1,
      totalPages: 1
    });
  }),

  // Get call by id
  http.get('/api/calls/:id', ({ params }: any) => {
    const { id } = params;
    return HttpResponse.json({
      id: parseInt(id as string),
      title: 'Problema com sistema',
      description: 'Sistema não está funcionando corretamente',
      status: 'OPEN',
      priority: 'HIGH',
      userId: 1,
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789'
      },
      images: [
        { id: 10, filename: 'screenshot-1.jpg', path: '/uploads/images-1750169081914-918867762.jpg' },
        { id: 11, filename: 'screenshot-2.png', path: '/uploads/images-1750804051901-757829671.png' }
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    });
  }),

  // Call status history
  http.get('/api/calls/:id/status-history', ({ params }: any) => {
    const now = new Date('2024-01-01T00:00:00.000Z').getTime();
    return HttpResponse.json([
      { id: 1, oldStatus: 'OPEN', newStatus: 'IN_PROGRESS', createdAt: new Date(now + 3600_000).toISOString() },
      { id: 2, oldStatus: 'IN_PROGRESS', newStatus: 'CLOSED', createdAt: new Date(now + 7200_000).toISOString() }
    ]);
  }),

  http.post('/api/calls', async ({ request }: any) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: 2,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { status: 201 });
  }),

  http.put('/api/calls/:id', async ({ params, request }: any) => {
    const { id } = params;
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: parseInt(id as string),
      ...body,
      updatedAt: new Date().toISOString()
    });
  }),

  http.delete('/api/calls/:id', () => {
    return HttpResponse.json({ message: 'Chamado deletado com sucesso' });
  }),

  // Delete call image
  http.delete('/api/calls/:callId/images/:imageId', ({ params }: any) => {
    return HttpResponse.json({ message: 'Imagem removida com sucesso' });
  })
];
