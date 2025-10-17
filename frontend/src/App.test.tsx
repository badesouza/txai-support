import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page heading', () => {
  render(<App />);
  expect(screen.getByText('Acesse sua conta')).toBeInTheDocument();
});
