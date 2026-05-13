const electron = require('electron');
console.log('typeof electron:', typeof electron);
console.log('electron keys:', typeof electron === 'object' ? Object.keys(electron).slice(0, 10) : 'N/A');
console.log('app:', typeof electron.app);
