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
    // NPCs never need the player's vertex count; small ones need even less
    this.mesh = buildCreature(species, Math.random(),
      species.length >= 2 ? 'med' : 'low');
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

  update(dt, getFloorY, playerInfo = null) {
    // --- benthic life (starfish, crabs): cling to the seafloor, crawl slowly ---
    if (this.species.benthic) {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 4 + Math.random() * 6;
        this._crawlDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      }
      if (this._crawlDir) this.mesh.position.addScaledVector(this._crawlDir, this.speed * dt);
      const fy = getFloorY(this.mesh.position.x, this.mesh.position.z);
      this.mesh.position.y = fy + this.species.length * 0.35;
      if (this._crawlDir) {
        _tmp.copy(this.mesh.position).add(this._crawlDir);
        this.mesh.lookAt(_tmp);
      }
      animateCreature(this.mesh, dt, 0.4);
      return;
    }

    // --- react to the player ---
    let fleeing = false;
    if (playerInfo) {
      const d = this.mesh.position.distanceTo(playerInfo.pos);
      const id = this.species.id;
      // A great white, or anything 4x your size, is a threat.
      // Whales are too big to care; anglerfish are ambush predators and hold still.
      const threat = (playerInfo.id === 'great_white' || playerInfo.length > this.species.length * 4)
        && id !== 'blue_whale' && id !== 'anglerfish';
      const fleeR = Math.max(14, playerInfo.length * 3);
      if (threat && d < fleeR) {
        let away = this.mesh.position.clone().sub(playerInfo.pos);
        away.y *= 0.4;                       // mostly flee horizontally
        if (away.lengthSq() < 0.01) {
          if (!this._escDir) {
            this._escDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          }
          away = this._escDir.clone();
        } else {
          this._escDir = null;
        }
        this.steer(away, dt, 3.5);
        fleeing = true;
      } else if (id === 'dolphin' && d < 45 && d > 9) {
        // curious dolphins drift toward you
        const toward = playerInfo.pos.clone().sub(this.mesh.position);
        this.steer(toward, dt, 0.7);
      }
    }
    this._mult = fleeing ? 2.0 : Math.max(1, (this._mult || 1) - dt * 0.8);

    this.wanderTimer -= dt;
    if (!fleeing && this.wanderTimer <= 0) {
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
    // Surface: air-breathing and surface-basking species are allowed right up
    // to the waterline; everything else keeps a body length of clearance.
    const surfaceOK = ['blue_whale', 'dolphin', 'vaquita', 'sea_turtle',
                       'sea_snake', 'sunfish', 'manta_ray'].includes(this.species.id);
    const ceiling = surfaceOK ? -this.species.length * 0.12 : -this.species.length;
    if (this.mesh.position.y > ceiling) {
      this.vel.y -= this.speed * dt * 1.5;
    }

    this.mesh.position.addScaledVector(this.vel, dt * this._mult);

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

  update(dt, getFloorY, playerInfo = null) {
    // move the shared center; if a threat is near, the whole school veers away
    this.wanderTimer -= dt;
    if (playerInfo) {
      const dC = this.center.distanceTo(playerInfo.pos);
      const threat = playerInfo.id === 'great_white' || playerInfo.length > this.species.length * 4;
      if (threat && dC < Math.max(18, playerInfo.length * 3.5)) {
        let esc = this.center.clone().sub(playerInfo.pos);
        esc.y *= 0.3;
        if (esc.lengthSq() < 0.01) {
          // dead-center on the threat: pick ONE random escape heading and keep it
          if (!this._escDir) {
            this._escDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          }
          esc = this._escDir.clone();
        } else {
          this._escDir = null;
        }
        this.centerVel.copy(esc).normalize();
        this.wanderTimer = 2;            // hold the escape heading briefly
      }
    }
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
      c.update(dt, getFloorY, playerInfo);
    }
  }

  get all() { return this.creatures; }
}
