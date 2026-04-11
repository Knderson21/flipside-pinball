import { Game } from './game';

const canvas = document.getElementById('pinball') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas element #pinball not found');

const game = new Game(canvas);

// Initial size
game.handleResize(window.innerWidth, window.innerHeight);

// Keep the canvas in sync with the window
window.addEventListener('resize', () => {
  game.handleResize(window.innerWidth, window.innerHeight);
});

game.start();
