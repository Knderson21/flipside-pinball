import { Game } from './game';
import { themes } from './theme';

const canvas = document.getElementById('pinball') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #pinball not found');

const game = new Game(canvas, themes);

game.handleResize(window.innerWidth, window.innerHeight);

window.addEventListener('resize', () => {
  game.handleResize(window.innerWidth, window.innerHeight);
});

game.start();
