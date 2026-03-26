import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the language selector on first visit', () => {
  render(<App />);
  expect(screen.getByText(/choose your language/i)).toBeInTheDocument();
});
