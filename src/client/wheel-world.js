import World from './world';
import * as CANNON from '../vendor/cannonjs/src/Cannon';
import RaycastVehicle from '../vendor/cannonjs/src/objects/RaycastVehicle';
import Demo from '../vendor/cannonjs/src/demo/Demo';

class Inspector extends Demo {
  constructor(options) {
    super(options);
  }
}

const games = [{
  length: 1000,
  points: [[15, 0], [24, -9], [36, 0], [21, 12], [15, 0], [0, 0],
    [-15, 0], [-24, -9], [-36, 0], [-21, 12], [-15, 0], [0, 0]]
}];

export default class WheelWorld extends World {
  constructor(options) {
    super(options);
    this.options = options;
    this.initWorld();
    this.demo.start();
    this.gameIdx = 0;
    this.pointIdx = 0;
    this.rewardFactors = {
      distanceProgressFactor: 100,
      orientationProgressFactor: 100
    };
  }
  initWorld() {
    while (this.options.firstChild) {
      this.options.removeChild(this.options.firstChild);
    }
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
        that.demo.addVisual(hfBody);
        that.lastX = that.vehicle.chassisBody.position.x;
    });
  }
  dropCar() {
    this.initWorld();
    this.demo.start();
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

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let reward = -0.1;
        const newState = this.getState();
        const rewardFactors = this.getRewardFactors();
        const lastTargetVector = this.vehicle.chassisBody.previousPosition.vsub(
          new CANNON.Vec3(games[this.gameIdx].points[this.pointIdx][0],
            games[this.gameIdx].points[this.pointIdx][1],
            this.vehicle.chassisBody.previousPosition.z));
        const bodyRelativeVector = this.vehicle.chassisBody.position.vsub(
          new CANNON.Vec3(games[this.gameIdx].points[this.pointIdx][0],
            games[this.gameIdx].points[this.pointIdx][1],
            this.vehicle.chassisBody.position.z));
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
          this.demo.restartCurrentScene();
        }

        resolve({
          originalState: JSON.stringify(originalState),
          newState,
          action,
          reward
          //reward: Math.max(Math.min(reward, 1), -1)
        });
      }, action === 'pause' ? (sleep*2) :
        action === 'longpause' ? (sleep*4) : sleep)
    });
  }
}
