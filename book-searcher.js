'use strict'


//world
var mFolder = '..\\mineServer\\world\\';

var fs = require('fs');

var mcRegion = require('minecraft-region');
var mcChunk = require('minecraft-chunk');

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

var books = [];
var filesToRead = 0;

function readWithFilename(filename){
    books = []
    fs.readFile(mFolder+"region/"+filename, function (err,data)
    {
        //console.log(filename);
        if (err) return console.log(err);
        var data2 = toArrayBuffer(data);

        var region = mcRegion(data2);
        var pos = filename.split(".");
        var ranges = [parseInt(pos[1])*32,parseInt(pos[1])*32+31,parseInt(pos[2])*32,parseInt(pos[2])*32+31];

        for(var x = ranges[0]; x < ranges[1]; x++){
          for(var y = ranges[2]; y < ranges[3]; y++){
            var chunk = region.getChunk(x,y);
            if(chunk){
              //console.log(chunk);
              var chunkObjects = chunk.root.Level.TileEntities.length;
              for(var a = 0; a < chunkObjects; a++){
                  var chest = chunk.root.Level.TileEntities[a];
                  if(chest.id == "Chest"){
                    //es realmente un chest, por lo que nos fijamos que tenga libros en su contenido
                    for(var b = 0; b < chest.Items.length; b++){
                      if(chest.Items[b].id == "minecraft:written_book"){
                        books.push(chest.Items[b]);
                        console.log("book found");
                      };
                    }
                  }
              }
            }
          }
        }
      filesToRead--;
      console.log("Remaining regions: "+filesToRead);
      if(filesToRead==0){
        process.send(books);
      }
    });
}

function update() {

    var files = fs.readdirSync(mFolder+"region/");
    var largo = files.length;
    filesToRead = largo;
    for(var i=0; i<largo; i++){
        readWithFilename(files[i]);
    }
}

process.on('message', function(m) {
  update();
});
