// creature.js — NPC behaviour. Solitary wander + lightweight boids for schools.

import * as THREE from 'three';
import { SPECIES } from '../data/species.js';
import { cruiseFor } from '../config.js';
import { buildCreature, animateCreature } from './fishMesh.js';

const _tmp = new THREE.Vector3();
const _fwd = new THREE.Vector3();

export class Creature {
  constructor(species, pos) {
    this.species = species;
    this.mesh = buildCreature(species);
    this.mesh.position.copy(pos);
    this.speed = cruiseFor(species) * 0.6;
    this.vel = new THREE.Vector3(
      (Math.random() - 0.5), (Math.random() - 0.5) * 0.2, (Math.random() - 0.5)
    ).normalize().multiplyScalar(this.speed);
    this.wanderTimer = Math.random() * 3;
    this.homeDepth = pos.y;
  }

  steer(dir, dt, rate = 1.2) {
    // gradually rotate velocity toward dir
    this.vel.lerp(dir.clone().normalize().multiplyScalar(this.speed), Math.min(1, dt * rate));
  }

  update(dt, getFloorY) {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 2 + Math.random() * 4;
      const wander = new THREE.Vector3(
        (Math.random() - 0.5), (Math.random() - 0.5) * 0.25, (Math.random() - 0.5)
      );
      this.steer(this.vel.clone().normalize().add(wander.multiplyScalar(0.8)), 1, 1);
    }

    // depth keeping: drift back toward home depth band
    const dy = this.homeDepth - this.mesh.position.y;
    this.vel.y += THREE.MathUtils.clamp(dy * 0.02, -1, 1) * dt * this.speed * 0.2;

    // floor avoidance
    const floor = getFloorY(this.mesh.position.x, this.mesh.position.z);
    if (this.mesh.position.y < floor + this.species.length * 1.2) {
      this.vel.y += this.speed * dt * 1.5;
    }
    // surface avoidance
    if (this.mesh.position.y > -this.species.length) {
      this.vel.y -= this.speed * dt * 1.5;
    }

    this.mesh.position.addScaledVector(this.vel, dt);

    // face travel direction
    _fwd.copy(this.vel).normalize();
    if (_fwd.lengthSq() > 0.0001) {
      _tmp.copy(this.mesh.position).add(_fwd);
      this.mesh.lookAt(_tmp);
    }

    const speed01 = THREE.MathUtils.clamp(this.vel.length() / this.speed, 0.2, 1);
    animateCreature(this.mesh, dt, speed01);
  }
}

// A school of the same species using cheap boids around a wandering center.
export class Flock {
  constructor(speciesId, center, n) {
    this.species = SPECIES[speciesId];
    this.creatures = [];
    this.center = center.clone();
    this.centerVel = new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize();
    this.wanderTimer = 0;
    for (let i = 0; i < n; i++) {
      const p = center.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6
      ));
      this.creatures.push(new Creature(this.species, p));
    }
  }

  update(dt, getFloorY) {
    // move the shared center
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 3 + Math.random() * 4;
      this.centerVel.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5) * 0.2, (Math.random() - 0.5))).normalize();
    }
    const cSpeed = this.creatures[0]?.speed || 5;
    this.center.addScaledVector(this.centerVel, cSpeed * dt);

    // centroid for cohesion
    const centroid = _tmp.set(0, 0, 0);
    for (const c of this.creatures) centroid.add(c.mesh.position);
    centroid.multiplyScalar(1 / this.creatures.length);

    for (const c of this.creatures) {
      const dir = new THREE.Vector3();
      // cohesion toward center + centroid
      dir.add(this.center.clone().sub(c.mesh.position).multiplyScalar(0.6));
      dir.add(centroid.clone().sub(c.mesh.position).multiplyScalar(0.2));
      // separation from close neighbours
      for (const o of this.creatures) {
        if (o === c) continue;
        const d = c.mesh.position.distanceTo(o.mesh.position);
        if (d < c.species.length * 2.2 && d > 0.0001) {
          dir.add(c.mesh.position.clone().sub(o.mesh.position).multiplyScalar((1 / d) * 2));
        }
      }
      if (dir.lengthSq() > 0.0001) c.steer(dir, dt, 1.5);
      c.update(dt, getFloorY);
    }
  }

  get all() { return this.creatures; }
}
