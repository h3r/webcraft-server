//requires
'use strict';

var fs = require('fs');

//to put some fancy markdown on the pages
var md = require("node-markdown").Markdown;

//to execute commandline commands and external applications
var cp = require('child_process');
var child = cp.fork(__dirname+'/book-searcher')

//to serve html and stuff
var express = require('express');


//to create folders.
var mkdirp = require('mkdirp');

//given a page, returns a content inside a tag
function getTag(text, tag){
    console.log(tmpString);
    var tmpString = text.match(new RegExp(tag + " (.+?) ]"));
    if(!tmpString)return null;
    return tmpString[1];

}

//Ask children for newer books every few minutes or so
//child.send('gimmeBooks');



//a crude way to chain the execFile calls in order since the jar seems have problem using the same tmp folder
//if multiple jars turn on at the same time.
function generateSlices(args){
  if(args.length>0){
    var myArgs = args.pop();

    mkdirp(myArgs[3], function (err) {
          //once created the folder, we ask for another slice...
          //console.log(myArgs)
          cp.execFile( "java", myArgs, null, function (error, stdout, stderr) {
                       console.log(error);
                       console.log(stdout);
                       console.log(stderr);
                       generateSlices(args);
                     });
    });
  }else{
    console.log("slice generation finished")
    setTimeout(function(){
      console.log("But we need more books");
      child.send('gimmeBooks');
      },350000);
  }
}

//this function parses the books to generate the cordinates and the arguments for the slice creation
function collectCoordinates(){
  fs.readFile(__dirname+'/contents/books.json', 'utf8', function (err, data) {
    if (err) console.log(err);
    var projects = JSON.parse(data);
    var args = new Array(); //we're in for one hell of a ride...
    //for each project
    for(var project in projects){
      if (projects.hasOwnProperty(project)) {
        var myProject = projects[project];
        for(var book in myProject){
          if (myProject.hasOwnProperty(book)) {
            var myBook = myProject[book];
            //for each book that has coordinates
            if(!(myBook['xyz'] == null) && !(myBook['title'] == null)){
              //we need to make a folder for each book that has coordinates
              (function () {
                var myBook2 = myBook;
              //  mkdirp(__dirname+'/contents/projects/'+myBook2['title'], function (err) {
                  if (err){
                    console.error(err);
                    return;
                  }
                    var coords = myBook2['xyz']

                    var maxHeight;
                    var minHeight;

                    var max_x;
                    var min_x;

                    var max_z;
                    var min_z;

                    if(parseInt(coords[1])>parseInt(coords[4])){
                      maxHeight = parseInt(coords[1]);
                      minHeight = parseInt(coords[4]);
                    }else{
                      maxHeight = parseInt(coords[4]);
                      minHeight = parseInt(coords[1]);
                    }

                    if(parseInt(coords[0])>parseInt(coords[3])){
                      max_x = parseInt(coords[0]);
                      min_x = parseInt(coords[3]);
                    }else{
                      max_x = parseInt(coords[3]);
                      min_x = parseInt(coords[0]);
                    }

                    if(parseInt(coords[2])>parseInt(coords[5])){
                      max_z = parseInt(coords[2]);
                      min_z = parseInt(coords[5]);
                    }else{
                      max_z = parseInt(coords[5]);
                      min_z = parseInt(coords[2]);
                    }

                    //for each difference in height
                    for(var i = minHeight; i<=maxHeight; i++){
                      //we generate an additional slice
                      var folder = __dirname+'/contents/projects/'+project+'/'+myBook2['title'];
                      var myArgs = ["-jar",
                                  __dirname+'\\tools\\jMc2Obj-dev_r313.jar',
                                  //__dirname+'\\tools\\jmc2obj_238_unoffical.jar',
                                  '-o',
                                  folder,
                                  "--area="+min_x+','+min_z+','+max_x+','+max_z,
                                  '--height='+i+','+(i+1),
                                  '--export=obj,mtl,tex',
                                  '--objfile='+i+'.obj',
                                  '--mtlfile='+i+'.mtl',
                                  //'--object-per-mat',
                                  '--offset=center',
                                  '--render-sides',
                                  //'--optimize-geometry',
                                  __dirname+"/../mineServer/world"];
                      args.push(myArgs);
                      }
                  //  });

              }());

            }
          }
        }
      }
    }
  generateSlices(args);
  });
}

//since book-looking seems to be a cpu intensive task, we delegate it to another thread.
//let's hope this is a good idea and not just premature optimization.
child.on('message', function(m) {
  //Receive Books and write them on some folder
  var projects = {};
  for(var i = 0; i<m.length;++i){
    var project = getTag(m[i]['tag']['pages'][0],"project");
    if(project){

      for(var p=1; p<m[i]['tag']['pages'].length;p++){
        var pagina = m[i]['tag']['pages'][p];
        m[i]['tag']['pages'][p]=md(pagina.substring(1, pagina.length-1));
      }

      var item = {
        title : m[i]['tag']['title'],
        xyz: getTag(m[i]['tag']['pages'][0],"xyz").split(" "),
        date: getTag(m[i]['tag']['pages'][0],"date"),
        cover: getTag(m[i]['tag']['pages'][0],"cover"),
        author: m[i]['tag']['author'],
        pages: m[i]['tag']['pages'],
      }
      console.log(item['pages'][1]);
      if(!projects.hasOwnProperty(project)){
        projects[project] = new Array();
      }
      projects[project].push(item);
    }
  }
  console.log(projects);
  fs.writeFile( __dirname+"/contents/books.json", JSON.stringify(projects), "utf-8", function(){
    collectCoordinates();
    });
  });


//and we serve some files...

var app = express();
var cors = require('cors')
app.use(cors());

app.all(cors());

app.set('jsonp callback', true);

app.use(express.static(__dirname+'/contents'));
//app.use('/app', express.static(__dirname+'/../mineClient'));


app.get('/', function (req, res) {
    //res.send('Hello World!');
    //res.render('index', {});
});

app.get('/posts', function (req, res) {
    res.sendFile(__dirname + '/contents/books.json');
});
/*
app.get('/obj/:project/:title', function(req, res) {
  var project = request.params.project;
  var title = request.params.title;
  res.send("Lo que tu quieres son los objetos del projecto "+project+" y el post "+title);
});
*/

var server = app.listen(3000, '0.0.0.0', function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Server listening at at http://%s:%s', host, port);

});
