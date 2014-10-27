
var self = {};

window.addEventListener("load", start, false);

// D3 scales

self.size = d3.scale.linear().range([5,20]).domain([0,100]).clamp(true);
self.height = d3.scale.linear().range([0,100]).domain([0,10000]);

self.nodes_material =   new THREE.MeshLambertMaterial({color: 0x0066CC});

self.links_material = new THREE.LineBasicMaterial({
                opacity: 0.3,
                transparent: true,
                color: 0xffff66
                });

/*
 * Setup all three.js and view related stuff.
 */

function initScene() {

  // Init d3 related stuff

// http://stackoverflow.com/questions/11400241/updating-links-on-a-force-directed-graph-from-dynamic-json-data

    var width = 960,
        height = 500,
        interval = 2000;

    self.svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    self.force = d3.layout.force()
        .size([width, height]);

    self.net_nodes = [];
    self.net_links = [];


    self.cubes = {};
    self.lines = {};

  var container = document.getElementById("container");

  self.keyboard = new THREEx.KeyboardState();

  cameraLeft = new THREE.Camera();
  cameraRight = new THREE.Camera();

  scene = new THREE.Scene();

  // Lights

  var light = new THREE.AmbientLight( 0x222222 );
  scene.add( light );

  var light = new THREE.DirectionalLight( 0xffffff, 1);
  light.position.set(5,5,5);
  scene.add( light );

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.shadowMapEnabled = true;

  renderer.setClearColor( 0x000000 );
  renderer.setSize(renderWidth, renderHeight);
  renderer.domElement.setAttribute("id", "three_canvas");
  container.appendChild( renderer.domElement );
  canvas = renderer.domElement;

    setInterval(function(){

        update_network();

    }, interval);

}

function update_network(){

    d3.json("../acq/network.json"+ '?' + Math.floor(Math.random() * 1000), function(error, graph) {

        for(var i=self.net_nodes.length; i<graph.nodes.length; i++)
        {
            self.net_nodes.push(graph.nodes[i]);
        }

        for(var j=self.net_links.length; j<graph.links.length; j++)
        {
            self.net_links.push(graph.links[j]);
        }


        var link = self.svg.selectAll("line")
            .data(self.net_links);

        link.enter().insert("line")
            .each(function(d,i){

               var geometry_line = new THREE.Geometry();

               geometry_line.vertices.push(new THREE.Vector3(0,0,0));
               geometry_line.vertices.push(new THREE.Vector3(0,0,0));

               self.lines[i] = new THREE.Line(geometry_line, self.links_material);

               self.lines[i].frustumCulled = false;

               scene.add(self.lines[i]);

        });


        var node = self.svg.selectAll("circle")
            .data(self.net_nodes);

//        node.attr("r", function(d,i){return d.weight ? self.size(d.weight):self.size(1)});

        node.each(function(d,i)
        {
            var factor =  d.weight ? self.size(d.weight):self.size(1);

            self.cubes[i].scale.x = factor;
            self.cubes[i].scale.y = factor;
            self.cubes[i].scale.z = factor;

        });

        node.enter().insert("svg:circle")
        .each(function(d,i){
              // A cube

              var geometry = new THREE.BoxGeometry(1, 1, 1);

              self.cubes[i] = new THREE.Mesh( geometry, self.nodes_material );
              self.cubes[i].position.y = 0;

              scene.add(self.cubes[i]);

            });


        self.force
          .nodes(self.net_nodes)
          .links(self.net_links)
          .start();

        self.force.on("tick", function() {

            node.each(function(d,i){

                self.cubes[i].position.x = d.x;
                self.cubes[i].position.z = d.y;
                self.cubes[i].position.y = self.height(d.followers+1);

            });


            link.each(function(d,i){
                    self.lines[i].geometry.vertices[0].x = d.source.x;
                    self.lines[i].geometry.vertices[0].y = self.height(d.source.followers);
                    self.lines[i].geometry.vertices[0].z = d.source.y;
                    self.lines[i].geometry.vertices[1].x = d.target.x;
                    self.lines[i].geometry.vertices[1].y = self.height(d.target.followers);
                    self.lines[i].geometry.vertices[1].z = d.target.y;
                    self.lines[i].geometry.verticesNeedUpdate = true;
                })
            });

    });

}

/*
 * Main render loop.  
 */

function animate() {
  requestAnimationFrame(animate);
  render();
}




/*
 Check keyboard and update cameras accordingly...
 */

function keyboard_update(){

        if ( self.keyboard.pressed("q") ) { cameraLeft.position.z-=50;cameraRight.position.z-=50;}
        if ( self.keyboard.pressed("a") ) { cameraLeft.position.z+=50;cameraRight.position.z+=50;}
        if ( self.keyboard.pressed("w") ) { cameraLeft.position.y+=50;cameraRight.position.y+=50;}
        if ( self.keyboard.pressed("s") ) { cameraLeft.position.y-=50;cameraRight.position.y-=50;}
        if ( self.keyboard.pressed("o") ) { cameraLeft.position.x+=50;cameraRight.position.x+=50;}
        if ( self.keyboard.pressed("p") ) { cameraLeft.position.x-=50;cameraRight.position.x-=50;}

}

/*
 * Renders the scene with three.js.
 * Static when vr is disabled, according
 * to vr device rotation otherwise.
 */

function render() {

  // Update cameras based on cameras ...

  keyboard_update();

  renderer.enableScissorTest(true);

  if (vrPosDev) {
    // read the orientation from the HMD, and set the rotation on all cameras
    var state = vrPosDev.getState();
    var qrot = new THREE.Quaternion();
    qrot.set(state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w);

    cameraLeft.setRotationFromQuaternion(qrot);
    cameraRight.setRotationFromQuaternion(qrot);

    // status output
    orientationOutput.innerHTML = numObjectToString(state.orientation);
    positionOutput.innerHTML = numObjectToString(state.position);
    angularVelocityOutput.innerHTML = numObjectToString(state.angularVelocity);
    linearVelocityOutput.innerHTML = numObjectToString(state.linearVelocity);
    angularAccelerationOutput.innerHTML = numObjectToString(state.angularAcceleration);
    linearAccelerationOutput.innerHTML = numObjectToString(state.linearAcceleration);


    // render left eye
    renderer.setViewport(0, 0, renderWidth, renderHeight);
    renderer.setScissor(0, 0, renderWidth, renderHeight);
    renderer.render(scene, cameraLeft);

    // render right eye
    renderer.setViewport(renderWidth, 0, renderWidth, renderHeight);
    renderer.setScissor(renderWidth, 0, renderWidth, renderHeight);
    renderer.render(scene, cameraRight);
  } else {    
    renderer.setViewport(0, 0, renderWidth, renderHeight);
    renderer.setScissor(0, 0, renderWidth, renderHeight);
    renderer.render(scene, camera);
  }
}

