// The async bootstrap gives Module Federation time to initialize the shared scope.
import('./bootstrap').catch(error => {
  console.error(error);
  const root = document.getElementById('root');
  const message = document.createElement('p');
  message.textContent = 'Não foi possível iniciar o FitForge. Confira sua conexão e recarregue a página.';
  root.replaceChildren(message);
});
