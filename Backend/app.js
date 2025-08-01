const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const cron = require('node-cron')
const fs = require('fs');
const http = require('http');
const PORT = process.env.PORT || 7624;
const { downloadYouTubeVideo, getVideoInfo } = require("./index.js");
const { initSocket } = require('./Initialized Package/socket.js');

// Initialization
const server = http.createServer(app);
initSocket(server);

// Middlewares
app.use('/videos', express.static(path.join(__dirname, 'downloads')));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.status(200).json({"status":"Working"});
});

app.post('/getVideoInfo', async  (req,res) => {
    try{
      const data = await getVideoInfo(req.body.url);
      res.json({data:data.formats, title:data.title});
    }
    catch(err){
      res.status(404).json({'message':'Not a Valid Link',Error:err})
    }
}) 

app.post('/getDownloaded', async (req, res) => {
  try{
    const response = await downloadYouTubeVideo(req.body.url,req.body.itag);
    if(response.completed){
      return res.status(200).json({'message':'Video Downloaded Successfully', videoLink: response.videoURL, title: response.title});
    }
    else{
        return res.status(404).json({Error:'Error in downloading video'});
    }
  }
  catch(err){
    console.error(err);
    return res.status(404).json({success: false, message: "Something went wrong.Try downloading other video format."});
  }
});

// Cron Job to delete videos after 10 minutes.
cron.schedule('0 0 * * *', () => {
    const folderPath = path.join(__dirname,'downloads');
    fs.readdir(folderPath, (err, files) => {
      if(err){
        console.error(err);
        return
      }

      if(files.length !== 0){
        files.forEach((file) => {
          const filePath = path.join(folderPath,file);
          fs.unlink(filePath, (err) => {
            if(err){
              console.error(err);
            }
          })
        })
      }

    })
}); 

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Socket Server running at http://localhost:${PORT}`);
});