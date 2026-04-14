require('./start');
const express = require('express');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
app.use('/api', dashboardRoutes);

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log('Test server on port', port);
  
  try {
    // Manually simulate what happens in middleware + controller
    const jwt = require('jsonwebtoken');
    const { User, Family } = require('./lib/models');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiaWF0IjoxNzc1ODQ1OTkyLCJleHAiOjE3NzY0NTA3OTJ9.dNloBD0oVPiYQcVEYEbuin1MLfWyuzCh3mJefRQBBIk';
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    
    // Replicate auth middleware
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Family, as: 'Family', required: false }],
    });
    console.log('Auth loaded user:', user?.name, 'family_id:', user?.family_id);
    
    // Create mock request/response
    const mockReq = { 
      user,  // This is what middleware sets
      query: {}
    };
    
    let responseData;
    const mockRes = {
      json: (data) => { responseData = data; },
      status: function(code) { 
        this.statusCode = code;
        return this;
      }
    };
    
    // Call the controller directly (bypass Express auth middleware entirely)
    const dash = require('./controllers/dashboardController');
    await dash.getDashboard(mockReq, mockRes);
    
    console.log('SUCCESS!');
    console.log('Response keys:', Object.keys(responseData));
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
  
  server.close();
  process.exit(0);
});