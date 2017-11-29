import World from './world';
import * as CANNON from '../vendor/cannonjs/src/Cannon';
import RaycastVehicle from '../vendor/cannonjs/src/objects/RaycastVehicle';
import Demo from '../vendor/cannonjs/src/demo/Demo';

class Inspector extends Demo {
  constructor(options) {
    super(options);
  }
}

export default class WheelWorld extends World {
  constructor(options) {
    super(options);
    this.options = options;
    this.initWorld();
    this.demo.start();
  }
  initWorld() {
    this.demo = new Demo(this.options);
    this.mass = 150;

    const that = this;

    this.demo.addScene("car",function(){
        var world = that.demo.getWorld();
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
        that.demo.addVisual(chassisBody);

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
            that.demo.addVisual(wheelBody);
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
        var sizeX = 64,
            sizeY = 64;

        for (var i = 0; i < sizeX; i++) {
            matrix.push([]);
            for (var j = 0; j < sizeY; j++) {
                var height = Math.cos(i / sizeX * Math.PI * 5) * Math.cos(j/sizeY * Math.PI * 5) * 2 + 2;
                if(i===0 || i === sizeX-1 || j===0 || j === sizeY-1)
                    height = 3;
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
        that.demo.addVisual(hfBody);
    });
  }
  dropFood() {
    this.food = [parseInt(Math.random() * 12), parseInt(Math.random() * 12)];
  }
  getState() {
    return {
      world: this.demo.getWorld(),
      vehicle: this.vehicle
    };
  }
  doAction(action) {
    var up = (action == 'keyup');

    if(!up && action !== 'keydown'){
        return;
    }

    this.vehicle.setBrake(0, 0);
    this.vehicle.setBrake(0, 1);
    this.vehicle.setBrake(0, 2);
    this.vehicle.setBrake(0, 3);

    switch(action){

    case 'up': // forward
        this.vehicle.applyEngineForce(up ? 0 : -maxForce, 2);
        this.vehicle.applyEngineForce(up ? 0 : -maxForce, 3);
        break;

    case 'down': // backward
        this.vehicle.applyEngineForce(up ? 0 : maxForce, 2);
        this.vehicle.applyEngineForce(up ? 0 : maxForce, 3);
        break;

    case 'brake': // b
        this.vehicle.setBrake(brakeForce, 0);
        this.vehicle.setBrake(brakeForce, 1);
        this.vehicle.setBrake(brakeForce, 2);
        this.vehicle.setBrake(brakeForce, 3);
        break;

    case 'right': // right
        this.vehicle.setSteeringValue(up ? 0 : -maxSteerVal, 0);
        this.vehicle.setSteeringValue(up ? 0 : -maxSteerVal, 1);
        break;

    case 'left': // left
        this.vehicle.setSteeringValue(up ? 0 : maxSteerVal, 0);
        this.vehicle.setSteeringValue(up ? 0 : maxSteerVal, 1);
        break;

    }
    this.dropFood();
    return {
      originalState,
      newState: this.getState(),
      action,
      reward: -1
    };
  }
}
