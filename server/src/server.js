
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

// Start the API server.
const server = app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});

// Close the server cleanly when the process is stopped.
process.on('SIGINT', () => {
    server.close(() => {
        console.log('API server stopped');
        process.exit(0);
    });
});
