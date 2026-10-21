import('./bootstrap').catch(error => { console.error(error); document.getElementById('root').textContent = 'Não foi possível iniciar este módulo. Recarregue a página.'; });
