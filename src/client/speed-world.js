import * as CANNON from '../vendor/cannonjs/src/Cannon';
import dat from '../vendor/cannonjs/libs/dat.gui';
import THREE from '../vendor/cannonjs/libs/Three';
import {SmoothieChart, TimeSeries} from '../vendor/cannonjs/libs/smoothie';
import {Stats} from '../vendor/cannonjs/libs/Stats';
import Detector from '../vendor/cannonjs/libs/Detector';
import TrackballControls from '../vendor/cannonjs/libs/TrackballControls';

const games = [{
  length: 1000,
  points: [[15, 0], [24, -9], [36, 0], [21, 12], [15, 0], [0, 0],
    [-15, 0], [-24, -9], [-36, 0], [-21, 12], [-15, 0], [0, 0]]
}];

class GeometryCache {
  constructor(createFunc, world) {
    this.geometries = [];
    this.gone=[];
    this.world = world;
    this.createFunc = createFunc;
  }

  request() {
    if (this.geometries.length) {
      var geo = this.geometries.pop();
    } else {
      var geo = this.createFunc();
    }
    this.world.scene.add(geo);
    this.gone.push(geo);
    return geo;
  }

  restart() {
    while(this.gone.length){
      this.geometries.push(gone.pop());
    }
  }

  hideCached() {
    for(var i=0; i<this.geometries.length; i++){
      this.world.scene.remove(geometries[i]);
    }
  }
}

export default class SpeedWorld {
  constructor(options) {
    this.options = options;
    this.settings = {
      stepFrequency: 60,
      quatNormalizeSkip: 2,
      quatNormalizeFast: true,
      gx: 0,
      gy: 0,
      gz: 0,
      iterations: 3,
      tolerance: 0.0001,
      k: 1e6,
      d: 3,
      scene: 0,
      paused: false,
      rendermode: "solid",
      constraints: false,
      contacts: false,  // Contact points
      cm2contact: false, // center of mass to contact points
      normals: false, // contact normals
      axes: false, // "local" frame axes
      particleSize: 0.1,
      shadows: false,
      aabbs: false,
      profiling: false,
      maxSubSteps: 20
    };

    this.bodies = [];
    this.visuals = [];
    this.scenes = [];
    this.scenePicker = {};
    this.gameIdx = 0;
    this.pointIdx = 0;
    this.rewardFactors = {
      distanceProgressFactor: 100,
      orientationProgressFactor: 100
    };

    var three_contactpoint_geo = new THREE.SphereGeometry( 0.1, 6, 6);
    var particleGeo = this.particleGeo = new THREE.SphereGeometry( 1, 16, 8 );

    // Material
    var materialColor = 0xdddddd;
    var solidMaterial = new THREE.MeshLambertMaterial( { color: materialColor } );
    //THREE.ColorUtils.adjustHSV( solidMaterial.color, 0, 0, 0.9 );
    var wireframeMaterial = new THREE.MeshLambertMaterial( { color: 0xffffff, wireframe:true } );
    this.currentMaterial = solidMaterial;
    var contactDotMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
    var particleMaterial = this.particleMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000 } );

    // Geometry caches
    this.contactMeshCache = new GeometryCache(function(){
      return new THREE.Mesh( three_contactpoint_geo, contactDotMaterial );
    }, this);
    this.cm2contactMeshCache = new GeometryCache(function(){
      var geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0,0,0));
      geometry.vertices.push(new THREE.Vector3(1,1,1));
      return new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0xff0000 } ) );
    }, this);
    var bboxGeometry = new THREE.BoxGeometry(1,1,1);
    var bboxMaterial = new THREE.MeshBasicMaterial({
      color: materialColor,
      wireframe: true
    });
    this.bboxMeshCache = new GeometryCache(function(){
      return new THREE.Mesh(bboxGeometry,bboxMaterial);
    }, this);
    this.distanceConstraintMeshCache = new GeometryCache(function(){
      var geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0,0,0));
      geometry.vertices.push(new THREE.Vector3(1,1,1));
      return new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0xff0000 } ) );
    }, this);
    var p2pConstraintMeshCache = new GeometryCache(function(){
      var geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0,0,0));
      geometry.vertices.push(new THREE.Vector3(1,1,1));
      return new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0xff0000 } ) );
    }, this);
    this.normalMeshCache = new GeometryCache(function(){
      var geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0,0,0));
      geometry.vertices.push(new THREE.Vector3(1,1,1));
      return new THREE.Line( geometry, new THREE.LineBasicMaterial({color:0x00ff00}));
    }, this);
    this.axesMeshCache = new GeometryCache(function(){
      var mesh = new THREE.Object3D();
      //mesh.useQuaternion = true;
      var origin = new THREE.Vector3(0,0,0);
      var gX = new THREE.Geometry();
      var gY = new THREE.Geometry();
      var gZ = new THREE.Geometry();
      gX.vertices.push(origin);
      gY.vertices.push(origin);
      gZ.vertices.push(origin);
      gX.vertices.push(new THREE.Vector3(1,0,0));
      gY.vertices.push(new THREE.Vector3(0,1,0));
      gZ.vertices.push(new THREE.Vector3(0,0,1));
      var lineX = new THREE.Line( gX, new THREE.LineBasicMaterial({color:0xff0000}));
      var lineY = new THREE.Line( gY, new THREE.LineBasicMaterial({color:0x00ff00}));
      var lineZ = new THREE.Line( gZ, new THREE.LineBasicMaterial({color:0x0000ff}));
      mesh.add(lineX);
      mesh.add(lineY);
      mesh.add(lineZ);
      return mesh;
    }, this);

    this.world = new CANNON.World();
    this.world.broadphase = new CANNON.NaiveBroadphase();

    var renderModes = ["solid","wireframe"];
    this.scene = new THREE.Scene();
    this.initWorld();
    this.start();
  }

  getWorld() {
    return this.world;
  }

  restartGeometryCaches(){
    this.contactMeshCache.restart();
    this.contactMeshCache.hideCached();

    this.cm2contactMeshCache.restart();
    this.cm2contactMeshCache.hideCached();

    this.distanceConstraintMeshCache.restart();
    this.distanceConstraintMeshCache.hideCached();

    this.normalMeshCache.restart();
    this.normalMeshCache.hideCached();
  }

  tickPhysics(){
    this.tick = this.tick ? this.tick + 100 : 100;

    this.world.step(1/60, this.tick, this.settings.maxSubSteps);
  }

  addScene(title,initfunc){
    if(typeof(title) !== "string"){
      throw new Error("1st argument of Demo.addScene(title,initfunc) must be a string!");
    }
    if(typeof(initfunc)!=="function"){
      throw new Error("2nd argument of Demo.addScene(title,initfunc) must be a function!");
    }
    this.scenes.push(initfunc);
    var idx = this.scenes.length-1;
    this.scenePicker[title] = function(){
      this.changeScene(idx);
    };
  }

  start() {
    this.buildScene(0);
  }

  buildScene(n) {
      // Remove current bodies and visuals
      var num = this.visuals.length;
      for (var i=0; i<num; i++){
          this.world.remove(this.bodies.pop());
          var mesh = this.visuals.pop();
          this.scene.remove(mesh);
      }
      // Remove all constraints
      while (this.world.constraints.length){
          this.world.removeConstraint(this.world.constraints[0]);
      }

      // Run the user defined "build scene" function
      this.scenes[n]();

      this.restartGeometryCaches();
  }

  initWorld() {
    this.mass = 150;

    const that = this;

    this.addScene("car",function(){
        var world = that.getWorld();
        world.broadphase = new CANNON.SAPBroadphase(world);
        world.gravity.set(0, 0, -10);
        world.defaultContactMaterial.friction = 0;

        var groundMaterial = new CANNON.Material("groundMaterial");
        var wheelMaterial = new CANNON.Material("wheelMaterial");
        var wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
            friction: 0.3,
            restitution: 0,
            contactEquationStiffness: 1000
        });

        // We must add the contact materials to the world
        world.addContactMaterial(wheelGroundContactMaterial);

        var chassisShape;
        chassisShape = new CANNON.Box(new CANNON.Vec3(2, 1,0.5));
        var chassisBody = new CANNON.Body({ mass: that.mass });
        chassisBody.addShape(chassisShape);
        chassisBody.position.set(0, 0, 4);
        chassisBody.angularVelocity.set(0, 0, 0.5);
        that.addVisual(chassisBody);

        var options = {
            radius: 0.5,
            directionLocal: new CANNON.Vec3(0, 0, -1),
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 5,
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            maxSuspensionForce: 100000,
            rollInfluence:  0.01,
            axleLocal: new CANNON.Vec3(0, 1, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: true
        };

        // Create the vehicle
        that.vehicle = new CANNON.RaycastVehicle({
            chassisBody: chassisBody,
        });

        options.chassisConnectionPointLocal.set(1, 1, 0);
        that.vehicle.addWheel(options);

        options.chassisConnectionPointLocal.set(1, -1, 0);
        that.vehicle.addWheel(options);

        options.chassisConnectionPointLocal.set(-1, 1, 0);
        that.vehicle.addWheel(options);

        options.chassisConnectionPointLocal.set(-1, -1, 0);
        that.vehicle.addWheel(options);

        that.vehicle.addToWorld(world);

        var wheelBodies = [];
        for(var i=0; i<that.vehicle.wheelInfos.length; i++){
            var wheel = that.vehicle.wheelInfos[i];
            var cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
            var wheelBody = new CANNON.Body({
                mass: 0
            });
            wheelBody.type = CANNON.Body.KINEMATIC;
            wheelBody.collisionFilterGroup = 0; // turn off collisions
            var q = new CANNON.Quaternion();
            q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
            wheelBodies.push(wheelBody);
            that.addVisual(wheelBody);
            world.addBody(wheelBody);
        }

        // Update wheels
        world.addEventListener('postStep', function(){
            for (var i = 0; i < that.vehicle.wheelInfos.length; i++) {
                that.vehicle.updateWheelTransform(i);
                var t = that.vehicle.wheelInfos[i].worldTransform;
                var wheelBody = wheelBodies[i];
                wheelBody.position.copy(t.position);
                wheelBody.quaternion.copy(t.quaternion);
            }
        });

        var matrix = [];
        var sizeX = 10,
            sizeY = 10;

        for (var i = 0; i < sizeX; i++) {
            matrix.push([]);
            for (var j = 0; j < sizeY; j++) {
                var height = 0;
                if(i===0 || i === sizeX-1 || j===0 || j === sizeY-1)
                    height = 0;
                matrix[i].push(height);
            }
        }

        var hfShape = new CANNON.Heightfield(matrix, {
            elementSize: 100 / sizeX
        });
        var hfBody = new CANNON.Body({ mass: 0 });
        hfBody.addShape(hfShape);
        hfBody.position.set(-sizeX * hfShape.elementSize / 2, -sizeY * hfShape.elementSize / 2, -1);
        world.addBody(hfBody);
        that.addVisual(hfBody);
        that.lastX = that.vehicle.chassisBody.position.x;
    });
  }

  addVisual(body) {
      var s = this.settings;
      // What geometry should be used?
      var mesh;
      if(body instanceof CANNON.Body){
        mesh = this.shape2mesh(body);
      }
      if(mesh) {
        // Add body
        this.bodies.push(body);
        this.visuals.push(mesh);
        body.visualref = mesh;
        body.visualref.visualId = this.bodies.length - 1;
        //mesh.useQuaternion = true;
        this.scene.add(mesh);
      }
  }
  updateVisuals(){
      var N = this.bodies.length;

      // Read position data into visuals
      for(var i=0; i<N; i++){
          var b = this.bodies[i],
              visual = visuals[i];

          // Interpolated or not?
          var bodyPos = b.interpolatedPosition;
          var bodyQuat = b.interpolatedQuaternion;
          if(settings.paused){
              bodyPos = b.position;
              bodyQuat = b.quaternion;
          }

          visual.position.copy(bodyPos);
          if(b.quaternion){
              visual.quaternion.copy(bodyQuat);
          }
      }

      // Render contacts
      contactMeshCache.restart();
      if(settings.contacts){
          // if ci is even - use body i, else j
          for(var ci=0; ci < world.contacts.length; ci++){
              for(var ij=0; ij < 2; ij++){
                  var  mesh = contactMeshCache.request(),
                  c = world.contacts[ci],
                  b = ij===0 ? c.bi : c.bj,
                  r = ij===0 ? c.ri : c.rj;
                  mesh.position.set( b.position.x + r.x , b.position.y + r.y , b.position.z + r.z );
              }
          }
      }
      contactMeshCache.hideCached();

      // Lines from center of mass to contact point
      cm2contactMeshCache.restart();
      if(settings.cm2contact){
          for(var ci=0; ci<world.contacts.length; ci++){
              for(var ij=0; ij < 2; ij++){
                  var line = cm2contactMeshCache.request(),
                      c = world.contacts[ci],
                      b = ij===0 ? c.bi : c.bj,
                      r = ij===0 ? c.ri : c.rj;
                  line.scale.set( r.x, r.y, r.z);
                  makeSureNotZero(line.scale);
                  line.position.copy(b.position);
              }
          }
      }
      cm2contactMeshCache.hideCached();

      distanceConstraintMeshCache.restart();
      p2pConstraintMeshCache.restart();
      if(settings.constraints){
          // Lines for distance constraints
          for(var ci=0; ci<world.constraints.length; ci++){
              var c = world.constraints[ci];
              if(!(c instanceof CANNON.DistanceConstraint)){
                  continue;
              }

              var nc = c.equations.normal;

              var bi=nc.bi, bj=nc.bj, line = distanceConstraintMeshCache.request();
              var i=bi.id, j=bj.id;

              // Remember, bj is either a Vec3 or a Body.
              var v;
              if(bj.position){
                  v = bj.position;
              } else {
                  v = bj;
              }
              line.scale.set( v.x-bi.position.x,
                              v.y-bi.position.y,
                              v.z-bi.position.z );
              makeSureNotZero(line.scale);
              line.position.copy(bi.position);
          }


          // Lines for distance constraints
          for(var ci=0; ci<world.constraints.length; ci++){
              var c = world.constraints[ci];
              if(!(c instanceof CANNON.PointToPointConstraint)){
                  continue;
              }
              var n = c.equations.normal;
              var bi=n.bi, bj=n.bj, relLine1 = p2pConstraintMeshCache.request(), relLine2 = p2pConstraintMeshCache.request(), diffLine = p2pConstraintMeshCache.request();
              var i=bi.id, j=bj.id;

              relLine1.scale.set( n.ri.x, n.ri.y, n.ri.z );
              relLine2.scale.set( n.rj.x, n.rj.y, n.rj.z );
              diffLine.scale.set( -n.penetrationVec.x, -n.penetrationVec.y, -n.penetrationVec.z );
              makeSureNotZero(relLine1.scale);
              makeSureNotZero(relLine2.scale);
              makeSureNotZero(diffLine.scale);
              relLine1.position.copy(bi.position);
              relLine2.position.copy(bj.position);
              n.bj.position.vadd(n.rj,diffLine.position);
          }
      }
      p2pConstraintMeshCache.hideCached();
      distanceConstraintMeshCache.hideCached();

      // Normal lines
      normalMeshCache.restart();
      if(settings.normals){
          for(var ci=0; ci<world.contacts.length; ci++){
              var c = world.contacts[ci];
              var bi=c.bi, bj=c.bj, line=normalMeshCache.request();
              var i=bi.id, j=bj.id;
              var n = c.ni;
              var b = bi;
              line.scale.set(n.x,n.y,n.z);
              makeSureNotZero(line.scale);
              line.position.copy(b.position);
              c.ri.vadd(line.position,line.position);
          }
      }
      normalMeshCache.hideCached();

      // Frame axes for each body
      this.axesMeshCache.restart();
      if(settings.axes){
          for(var bi=0; bi<this.bodies.length; bi++){
              var b = this.bodies[bi], mesh=this.axesMeshCache.request();
              mesh.position.copy(b.position);
              if(b.quaternion){
                  mesh.quaternion.copy(b.quaternion);
              }
          }
      }
      this.axesMeshCache.hideCached();

      // AABBs
      this.bboxMeshCache.restart();
      if(settings.aabbs){
          for(var i=0; i<this.bodies.length; i++){
              var b = this.bodies[i];
              if(b.computeAABB){

                  if(b.aabbNeedsUpdate){
                      b.computeAABB();
                  }

                  // Todo: cap the infinite AABB to scene AABB, for now just dont render
                  if( isFinite(b.aabb.lowerBound.x) &&
                      isFinite(b.aabb.lowerBound.y) &&
                      isFinite(b.aabb.lowerBound.z) &&
                      isFinite(b.aabb.upperBound.x) &&
                      isFinite(b.aabb.upperBound.y) &&
                      isFinite(b.aabb.upperBound.z) &&
                      b.aabb.lowerBound.x - b.aabb.upperBound.x != 0 &&
                      b.aabb.lowerBound.y - b.aabb.upperBound.y != 0 &&
                      b.aabb.lowerBound.z - b.aabb.upperBound.z != 0){
                          var mesh = this.bboxMeshCache.request();
                          mesh.scale.set( b.aabb.lowerBound.x - b.aabb.upperBound.x,
                                          b.aabb.lowerBound.y - b.aabb.upperBound.y,
                                          b.aabb.lowerBound.z - b.aabb.upperBound.z);
                          mesh.position.set(  (b.aabb.lowerBound.x + b.aabb.upperBound.x)*0.5,
                                              (b.aabb.lowerBound.y + b.aabb.upperBound.y)*0.5,
                                              (b.aabb.lowerBound.z + b.aabb.upperBound.z)*0.5);
                      }
              }
          }
      }
      this.bboxMeshCache.hideCached();
  }
  addVisuals(bodies){
      for (var i = 0; i < bodies.length; i++) {
          this.addVisual(bodies[i]);
      }
  }
  removeVisual(body){
      if(body.visualref){
          var bodies = this.bodies,
              visuals = this.visuals,
              old_b = [],
              old_v = [],
              n = bodies.length;

          for(var i=0; i<n; i++){
              old_b.unshift(bodies.pop());
              old_v.unshift(visuals.pop());
          }

          var id = body.visualref.visualId;
          for(var j=0; j<old_b.length; j++){
              if(j !== id){
                  var i = j>id ? j-1 : j;
                  bodies[i] = old_b[j];
                  visuals[i] = old_v[j];
                  bodies[i].visualref = old_b[j].visualref;
                  bodies[i].visualref.visualId = i;
              }
          }
          body.visualref.visualId = null;
          this.scene.remove(body.visualref);
          body.visualref = null;
      }
  }
  removeAllVisuals(){
      while(this.bodies.length) {
          this.removeVisual(this.bodies[0]);
      }
  }

  shape2mesh(body) {
      var wireframe = this.settings.renderMode === "wireframe";
      var obj = new THREE.Object3D();

      for (var l = 0; l < body.shapes.length; l++) {
          var shape = body.shapes[l];

          var mesh;

          switch(shape.type){

          case CANNON.Shape.types.SPHERE:
              var sphere_geometry = new THREE.SphereGeometry( shape.radius, 8, 8);
              mesh = new THREE.Mesh( sphere_geometry, this.currentMaterial );
              break;

          case CANNON.Shape.types.PARTICLE:
              mesh = new THREE.Mesh( this.particleGeo, this.particleMaterial );
              var s = this.settings;
              mesh.scale.set(s.particleSize,s.particleSize,s.particleSize);
              break;

          case CANNON.Shape.types.PLANE:
              var geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
              mesh = new THREE.Object3D();
              var submesh = new THREE.Object3D();
              var ground = new THREE.Mesh( geometry, this.currentMaterial );
              ground.scale.set(100, 100, 100);
              submesh.add(ground);

              ground.castShadow = true;
              ground.receiveShadow = true;

              mesh.add(submesh);
              break;

          case CANNON.Shape.types.BOX:
              var box_geometry = new THREE.BoxGeometry(  shape.halfExtents.x*2,
                                                          shape.halfExtents.y*2,
                                                          shape.halfExtents.z*2 );
              mesh = new THREE.Mesh( box_geometry, this.currentMaterial );
              break;

          case CANNON.Shape.types.CONVEXPOLYHEDRON:
              var geo = new THREE.Geometry();

              // Add vertices
              for (var i = 0; i < shape.vertices.length; i++) {
                  var v = shape.vertices[i];
                  geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
              }

              for(var i=0; i < shape.faces.length; i++){
                  var face = shape.faces[i];

                  // add triangles
                  var a = face[0];
                  for (var j = 1; j < face.length - 1; j++) {
                      var b = face[j];
                      var c = face[j + 1];
                      geo.faces.push(new THREE.Face3(a, b, c));
                  }
              }
              geo.computeBoundingSphere();
              geo.computeFaceNormals();
              mesh = new THREE.Mesh( geo, this.currentMaterial );
              break;

          case CANNON.Shape.types.HEIGHTFIELD:
              var geometry = new THREE.Geometry();

              var v0 = new CANNON.Vec3();
              var v1 = new CANNON.Vec3();
              var v2 = new CANNON.Vec3();
              for (var xi = 0; xi < shape.data.length - 1; xi++) {
                  for (var yi = 0; yi < shape.data[xi].length - 1; yi++) {
                      for (var k = 0; k < 2; k++) {
                          shape.getConvexTrianglePillar(xi, yi, k===0);
                          v0.copy(shape.pillarConvex.vertices[0]);
                          v1.copy(shape.pillarConvex.vertices[1]);
                          v2.copy(shape.pillarConvex.vertices[2]);
                          v0.vadd(shape.pillarOffset, v0);
                          v1.vadd(shape.pillarOffset, v1);
                          v2.vadd(shape.pillarOffset, v2);
                          geometry.vertices.push(
                              new THREE.Vector3(v0.x, v0.y, v0.z),
                              new THREE.Vector3(v1.x, v1.y, v1.z),
                              new THREE.Vector3(v2.x, v2.y, v2.z)
                          );
                          var i = geometry.vertices.length - 3;
                          geometry.faces.push(new THREE.Face3(i, i+1, i+2));
                      }
                  }
              }
              geometry.computeBoundingSphere();
              geometry.computeFaceNormals();
              mesh = new THREE.Mesh(geometry, this.currentMaterial);
              break;

          case CANNON.Shape.types.TRIMESH:
              var geometry = new THREE.Geometry();

              var v0 = new CANNON.Vec3();
              var v1 = new CANNON.Vec3();
              var v2 = new CANNON.Vec3();
              for (var i = 0; i < shape.indices.length / 3; i++) {
                  shape.getTriangleVertices(i, v0, v1, v2);
                  geometry.vertices.push(
                      new THREE.Vector3(v0.x, v0.y, v0.z),
                      new THREE.Vector3(v1.x, v1.y, v1.z),
                      new THREE.Vector3(v2.x, v2.y, v2.z)
                  );
                  var j = geometry.vertices.length - 3;
                  geometry.faces.push(new THREE.Face3(j, j+1, j+2));
              }
              geometry.computeBoundingSphere();
              geometry.computeFaceNormals();
              mesh = new THREE.Mesh(geometry, this.currentMaterial);
              break;

          default:
              throw "Visual type not recognized: "+shape.type;
          }

          mesh.receiveShadow = true;
          mesh.castShadow = true;
          if(mesh.children){
              for(var i=0; i<mesh.children.length; i++){
                  mesh.children[i].castShadow = true;
                  mesh.children[i].receiveShadow = true;
                  if(mesh.children[i]){
                      for(var j=0; j<mesh.children[i].length; j++){
                          mesh.children[i].children[j].castShadow = true;
                          mesh.children[i].children[j].receiveShadow = true;
                      }
                  }
              }
          }

          var o = body.shapeOffsets[l];
          var q = body.shapeOrientations[l];
          mesh.position.set(o.x, o.y, o.z);
          mesh.quaternion.set(q.x, q.y, q.z, q.w);

          obj.add(mesh);
      }

      return obj;
  }

  getState() {
    const bodyRelativeVector = this.vehicle.chassisBody.position.vsub(
      new CANNON.Vec3(games[this.gameIdx].points[this.pointIdx][0],
        games[this.gameIdx].points[this.pointIdx][1],
        this.vehicle.chassisBody.position.z));
    const direction = Math.atan2(bodyRelativeVector.x, bodyRelativeVector.y);
    return {
      interpolatedQuaternionX: this.vehicle.chassisBody
        .interpolatedQuaternion.x.toPrecision(2),
      interpolatedQuaternionY: this.vehicle.chassisBody
        .interpolatedQuaternion.y.toPrecision(2),
      interpolatedQuaternionZ: this.vehicle.chassisBody
        .interpolatedQuaternion.z.toPrecision(2),
      interpolatedQuaternionW: this.vehicle.chassisBody
        .interpolatedQuaternion.w.toPrecision(2),
      wheelInfos: this.vehicle.wheelInfos.map(i => ({
        engineForce: i.engineForce,
        brake: i.brake,
        steering: i.steering
      })),
      pointIdx: this.pointIdx,
      gameIdx: this.gameIdx,
      directionToTarget: direction,
      speed: this.vehicle.currentVehicleSpeedKmHour,
      targetVectorDistance: bodyRelativeVector.length(),
      currentPosition: this.vehicle.chassisBody.position,
      targetPos: games[this.gameIdx].points[this.pointIdx]
    };
  }
  getRewardFactors() {
    return {
      distanceProgressFactor: this.rewardFactors.distanceProgressFactor,
      orientationProgressFactor: this.rewardFactors.orientationProgressFactor
    }
  }

  setRewardFactor(factor, n) {
    this.rewardFactors[factor] = n;
  }

  doAction(action, sleep) {
    const originalState = this.getState();
    var maxSteerVal = 0.5;
    var maxForce = 200;
    var brakeForce = 1000000;

    this.vehicle.setBrake(0, 0);
    this.vehicle.setBrake(0, 1);
    this.vehicle.setBrake(0, 2);
    this.vehicle.setBrake(0, 3);

    switch(action){

    case 'neutral': // forward
      this.vehicle.applyEngineForce(0, 2);
      this.vehicle.applyEngineForce(0, 3);
      break;

    case 'down-straight': // backward
      this.vehicle.setSteeringValue(0, 0);
      this.vehicle.setSteeringValue(0, 1);
      this.vehicle.applyEngineForce(0, 2);
      this.vehicle.applyEngineForce(0, 3);
      this.vehicle.applyEngineForce(maxForce, 2);
      this.vehicle.applyEngineForce(maxForce, 3);
      break;

    case 'brake': // b
      this.vehicle.setBrake(brakeForce, 0);
      this.vehicle.setBrake(brakeForce, 1);
      this.vehicle.setBrake(brakeForce, 2);
      this.vehicle.setBrake(brakeForce, 3);
      break;

    case 'right': // right
      this.vehicle.applyEngineForce(0, 2);
      this.vehicle.applyEngineForce(0, 3);
      this.vehicle.applyEngineForce(-maxForce, 2);
      this.vehicle.applyEngineForce(-maxForce, 3);
      this.vehicle.setSteeringValue(0, 0);
      this.vehicle.setSteeringValue(0, 1);
      this.vehicle.setSteeringValue(-maxSteerVal, 0);
      this.vehicle.setSteeringValue(-maxSteerVal, 1);
      break;

    case 'down-right': // right
      this.vehicle.applyEngineForce(0, 2);
      this.vehicle.applyEngineForce(0, 3);
      this.vehicle.applyEngineForce(maxForce, 2);
      this.vehicle.applyEngineForce(maxForce, 3);
      this.vehicle.setSteeringValue(0, 0);
      this.vehicle.setSteeringValue(0, 1);
      this.vehicle.setSteeringValue(-maxSteerVal, 0);
      this.vehicle.setSteeringValue(-maxSteerVal, 1);
      break;

    case 'down-left': // right
      this.vehicle.applyEngineForce(0, 2);
      this.vehicle.applyEngineForce(0, 3);
      this.vehicle.applyEngineForce(maxForce, 2);
      this.vehicle.applyEngineForce(maxForce, 3);
      this.vehicle.setSteeringValue(0, 0);
      this.vehicle.setSteeringValue(0, 1);
      this.vehicle.setSteeringValue(-maxSteerVal, 0);
      this.vehicle.setSteeringValue(-maxSteerVal, 1);
      break;


    case 'straight': // right
      this.vehicle.setSteeringValue(0, 0);
      this.vehicle.setSteeringValue(0, 1);
      this.vehicle.applyEngineForce(0, 2);
      this.vehicle.applyEngineForce(0, 3);
      this.vehicle.applyEngineForce(-maxForce, 2);
      this.vehicle.applyEngineForce(-maxForce, 3);

      break;

    case 'left': // left
      this.vehicle.applyEngineForce(0, 2);
      this.vehicle.applyEngineForce(0, 3);
      this.vehicle.applyEngineForce(-maxForce, 2);
      this.vehicle.applyEngineForce(-maxForce, 3);
      this.vehicle.setSteeringValue(0, 0);
      this.vehicle.setSteeringValue(0, 1);
      this.vehicle.setSteeringValue(maxSteerVal, 0);
      this.vehicle.setSteeringValue(maxSteerVal, 1);
      break;

    }

    const that = this;

    return new Promise((resolve, reject) => {
      function calcResult() {
        let reward = -0.1;
        const newState = that.getState();
        const rewardFactors = that.getRewardFactors();
        const lastTargetVector = that.vehicle.chassisBody.previousPosition.vsub(
          new CANNON.Vec3(games[that.gameIdx].points[that.pointIdx][0],
            games[that.gameIdx].points[that.pointIdx][1],
            that.vehicle.chassisBody.previousPosition.z));
        const bodyRelativeVector = that.vehicle.chassisBody.position.vsub(
          new CANNON.Vec3(games[that.gameIdx].points[that.pointIdx][0],
            games[that.gameIdx].points[that.pointIdx][1],
            that.vehicle.chassisBody.position.z));
        reward += Math.max(Math.min(
          (lastTargetVector.length() - bodyRelativeVector.length()) *
          rewardFactors.distanceProgressFactor,
        0.5),-0.5);
        const direction = Math.atan2(bodyRelativeVector.x, bodyRelativeVector.y);
        const lastDirection = Math.atan2(lastTargetVector.x, lastTargetVector.y);
        const directionDif = Math.abs(1.56 - lastDirection) - Math.abs(1.56 - direction);
        reward += Math.max(Math.min(directionDif
          * rewardFactors.orientationProgressFactor, 0.5),-0.5);
        console.log('target', direction, bodyRelativeVector.length());
        if (bodyRelativeVector.length() < 1) {
          reward = 2;
        }

        resolve({
          originalState: JSON.stringify(originalState),
          newState,
          action,
          reward
        });
      }
      let count = 100;
      function tickPhysics() {
        count--;
        if (count > 0) {
          that.tickPhysics();
          requestAnimationFrame(tickPhysics);
        } else {
          calcResult();
        }
      }
      tickPhysics();
    });
  }
}
