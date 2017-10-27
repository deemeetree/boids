class Boid {

  constructor(boid) {

    // Initial Properties
    this.id = boid.id;
    this.position = new Victor( boid.x, boid.y );
    var radiusCoefficients = [.5,.6,.7,.8,1];
    this.radiusCoefficient = Math.floor(Math.random() * radiusCoefficients.length);
    this.radius = boid.radius * radiusCoefficients[ this.radiusCoefficient ];
    this.introversionCoefficient = getRandomInt(20,80) / 100;
    this.introversion = boid.introversion * this.introversionCoefficient;
    this.quicknessCoefficient = getRandomInt(50,100) / 100;
    this.quickness = boid.quickness * this.quicknessCoefficient;
    this.racismCoefficient = getRandomInt(20,80) / 100;
    this.racism = boid.racism * this.racismCoefficient;
    this.color = boid.color;
    this.mass = (4/3) * Math.PI * Math.pow( this.radius,3 );

    // Speed & Velocity & Force
    this.maxSpeed = speedIndex * this.quickness;
    this.speed = this.maxSpeed * .5;
    var radians = Math.PI * getRandomInt(-99,100) / 100;
    this.velocity = new Victor( this.speed * Math.cos( radians ), this.speed * Math.sin( radians ) );
    //Force and Accel
    this.maxForce = .5;


  }

  // Arrival behavior to control boids arriving at their target
  seek( target ){
    var targetposition = target.clone();
    var diff = targetposition.subtract(this.position);
    var desired = new Victor(diff.x,diff.y);

    if (target.radius) {
      var buffer = target.radius + this.radius + 1;
    } else {
      var buffer = this.radius * 2 + 1;
    }

    var dist = diff.magnitude();
    if (dist < buffer) {
      desired.x = 0;
      desired.y = 0;
    } else if ( dist <= 100 ) {
      desired.normalize();
      desired.divide({x:this.maxSpeed * dist / 100,y:this.maxSpeed * dist / 100});
    } else {
      desired.limitMagnitude(this.maxSpeed);
    }
    desired.subtract(this.velocity);
    desired.limitMagnitude(this.maxForce);
    return desired;
  }

  // Separation Force
  separate( boids ){
    var sum = new Victor();
    var count = 0;
    for (var j = 0; j < boids.length; j++) {
      if ( this.color != boids[j].color ) {
        var racismMultiplier = this.racism;
      } else {
        var racismMultiplier = 0;
      }
      var desiredSeparation = this.radius + boids[j].radius + ( 25 * this.introversion ) + ( 50 * racismMultiplier );
      var sep = this.position.clone().distance(boids[j].position);
      if ( (sep > 0) && (sep < desiredSeparation) ) {
        var thisposition = this.position.clone();
        var diff = thisposition.subtract(boids[j].position);
        diff.normalize();
        diff.divide({x:sep,y:sep});
        sum.add(diff);
        count++;
      }
    }
    if (count > 0) {
      sum.divide({x:count,y:count});
      sum.normalize();
      sum.multiply({x:this.maxSpeed,y:this.maxSpeed});
      sum.subtract(this.velocity);
      sum.limitMagnitude(this.maxForce);
    }
    return sum;
  }

  align( boids ) {
    var neighborDist = 50;
    var sum = new Victor();
    var steer = new Victor();
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
      var dist = this.position.distance(boids[i].position);
      if ( dist > 0 && dist < neighborDist ) {
        sum.add(boids[i].velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.divide({x:count,y:count});
      sum.normalize()
      sum.multiply({x:this.maxSpeed,y:this.maxSpeed});
      steer = sum.subtract(this.velocity);
      steer.limitMagnitude(this.maxForce);
      return steer;
    } else {
      return steer;
    }
  }

  cohesion( boids ) {
    var neighborDist = 50;
    var sum = new Victor();
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
      var dist = this.position.distance(boids[i].position);
      if ( dist > 0 && dist < neighborDist ) {
        sum.add(boids[i].position);
        count++;
      }
    }
    if (count > 0) {
      sum.divide({x: count,y:count});
      return this.seek(sum);
    } else {
      return sum;
    }
  }

  avoidWalls() {

    if ( this.distanceFromHorWall() < this.radius * 10 || this.distanceFromVertWall() < this.radius * 10 ) {
      return this.seek(center);
    } else { return false; }

  }

  flock() {

    // Get Forces
    var alignForce = this.align(boids);
    if ( mouseSeek ) var mouseForce = this.seek(mouse.position);
    var separateForce = this.separate(boids);
    var cohesionForce = this.cohesion(boids);
    if ( walls ) var avoidWallsForce = this.avoidWalls();

    // Weight Forces
    var alignWeight = 1.2;
    if ( mouseSeek ) var mouseWeight = .2;
    var separateWeight = 1;
    var cohesionWeight = 1;
    if ( walls ) var avoidWallsWeight = 1;


    // Apply forces
    this.applyForce( alignForce, alignWeight );
    if ( mouseSeek ) this.applyForce( mouseForce, mouseWeight );
    this.applyForce( separateForce, separateWeight );
    this.applyForce( cohesionForce, cohesionWeight );
    if ( walls && avoidWallsForce ) this.applyForce( avoidWallsForce, avoidWallsWeight );

  }

  // Apply a force based on a coefficient
  applyForce( force, coefficient ) {
    if ( ! coefficient ) { var coefficient = 1; }
    force.multiply({x:coefficient,y:coefficient});
    this.velocity.add(force);
    this.velocity.limitMagnitude( this.maxSpeed );
  }

  nextPosition() {

    // Loop through behaviors to apply forces
    this.flock();

    // Update position
    this.position = this.position.add(this.velocity);

    // Stricter collision detection if enabled
    if ( collisions ) { this.detectCollision(); }

    // Check edges for walls or overruns
    this.edgeCheck();

  }

  // Check for wall bounces and border wrapping
  edgeCheck() {
    if (walls) {
      this.wallBounce();
    } else {
      this.borderWrap();
    }
  }

  // Check for agents passing borders and wrap to other side
  borderWrap() {
    if (this.position.x < 0) {
      this.position.x = document.body.clientWidth;
    } else if ( this.position.x > document.body.clientWidth ) {
      this.position.x = 0;
    }
    if (this.position.y < 0) {
      this.position.y = document.body.clientHeight;
    } else if ( this.position.y > document.body.clientHeight ) {
      this.position.y = 0;
    }
  }

  // Detect a wall hit and bounce back if necessary
  wallBounce() {
    if (this.position.x <= this.radius) {
      this.position.x = this.radius;
    } else if ( this.position.x >= document.body.clientWidth - this.radius) {
      this.position.x = document.body.clientWidth - this.radius;
    }
    if (this.position.y <= this.radius) {
      this.position.y = this.radius;
    } else if ( this.position.y >= document.body.clientHeight - this.radius ) {
      this.position.y = document.body.clientHeight - this.radius;
    }
    if ( this.distanceFromHorWall() <= this.radius  ) {
      this.velocity.invertY();
    }
    if ( this.distanceFromVertWall() <= this.radius  ) {
      this.velocity.invertX();
    }
  }

  distanceFromVertWall() {
    if (this.velocity.x > 0) {
      return document.body.clientWidth - ( this.position.x );
    } else {
      return this.position.x;
    }

  }

  distanceFromHorWall() {
    if (this.velocity.y > 0) {
      return document.body.clientHeight - ( this.position.y );
    } else {
      return this.position.y;
    }
  }

  // Draw Boid to screen
  draw(){
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
    c.closePath();
  }

  // Update a boid's position and draw
  update() {

    this.nextPosition();
    this.draw();

  }

  // Collision Detection
  detectCollision(){

    for (var i = 0; i < boids.length; i++) {
      if ( this === boids[i] ) { continue; }
      if ( getDistance( this.position.x, this.position.y, boids[i].position.x, boids[i].position.y) - ( this.radius + boids[i].radius ) < 0 ) {
        this.resolveCollision( this, boids[i]);
      }
    }
  }

  /**
 * Rotates coordinate system for velocities
 *
 * Takes velocities and alters them as if the coordinate system they're on was rotated
 *
 * @param  Object | velocity | The velocity of an individual particle
 * @param  Float  | angle    | The angle of collision between two objects in radians
 * @return Object | The altered x and y velocities after the coordinate system has been rotated
 */

 rotate(velocity, angle) {
    return {
        x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
        y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle)
    };
  }

/**
 * Swaps out two colliding particles' x and y velocities after running through
 * an elastic collision reaction equation
 *
 * @param  Object | particle      | A particle object with x and y coordinates, plus velocity
 * @param  Object | otherParticle | A particle object with x and y coordinates, plus velocity
 * @return Null | Does not return a value
 */
 resolveCollision(particle, otherParticle) {
   
    var xVelocityDiff = particle.velocity.x - otherParticle.velocity.x;
    var yVelocityDiff = particle.velocity.y - otherParticle.velocity.y;

    var xDist = otherParticle.position.x - particle.position.x;
    var yDist = otherParticle.position.y - particle.position.y;

    // Prevent accidental overlap of particles
    if ( xVelocityDiff * xDist + yVelocityDiff * yDist >= 0 ) {

      // Grab angle between the two colliding particles
      var angle = -Math.atan2(otherParticle.position.y - particle.position.y, otherParticle.position.x - particle.position.x);

      // Store mass in var for better readability in collision equation
      var m1 = particle.mass;
      var m2 = otherParticle.mass;

      // Velocity before equation
      var u1 = this.rotate(particle.velocity, angle);
      var u2 = this.rotate(otherParticle.velocity, angle);

      // Velocity after 1d collision equation
      var v1 = { x: u1.x * (m1 - m2) / (m1 + m2) + u2.x * 2 * m2 / (m1 + m2), y: u1.y };
      var v2 = { x: u2.x * (m1 - m2) / (m1 + m2) + u1.x * 2 * m2 / (m1 + m2), y: u2.y };

      // Final velocity after rotating axis back to original position
      var vFinal1 = this.rotate(v1, -angle);
      var vFinal2 = this.rotate(v2, -angle);

      // Swap particle velocities for realistic bounce effect
      particle.velocity.x = vFinal1.x;
      particle.velocity.y = vFinal1.y;
      particle.velocity.limitMagnitude(particle.maxSpeed);

      otherParticle.velocity.x = vFinal2.x;
      otherParticle.velocity.y = vFinal2.y;
      otherParticle.velocity.limitMagnitude(otherParticle.maxSpeed);
    }

  }


}
