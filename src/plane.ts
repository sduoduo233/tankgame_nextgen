import { Vector3, Euler, Object3D, Event, Group, Camera, Box3 } from "three";
import { generateUUID } from "three/src/math/MathUtils";
import { Ball } from "./ball";
import { Entity } from "./entity";
import { game } from "./main";

const MOVE_SPEED = 0.8

export class Plane extends Entity {

    private model: Group
    private clientSide: boolean

    constructor(clientSide: boolean, id: string) {
        super(id)
        this.clientSide = clientSide
        this.model = game.planeModel!.clone()
        this.model.rotation.reorder("YZX")
    }

    update(): void {
        if (!this.clientSide) return

        // move foward
        const rotation = this.getRotation()
        const velocity = new Vector3(
            -1 * Math.sin(rotation.y),
            0.5 * Math.sin(rotation.x),
            -1 * Math.cos(rotation.y)
        )
        this.getPosition().add(velocity.setLength(MOVE_SPEED))

        // wall check
        if (game.alive && this.collisionCheck(this.getBB())) {
            let collied = false
            this.model.children.forEach((child) => {
                let box = new Box3()
                box.expandByObject(child)
                if (this.collisionCheck(box)) collied = true
            })
            if (collied) {
                game.kill()
                game.ranking.addDeath("You")
            }
        }

        // rotation
        if (game.getKeys().w) {
            this.getRotation().x += 30 / 500
        }
        if (game.getKeys().s) {
            this.getRotation().x -= 30 / 500
        }
        if (game.getKeys().a) {
            this.getRotation().y += 40 / 500
        }
        if (game.getKeys().d) {
            this.getRotation().y -= 40 / 500
        }
    }

    updateCamera(): void {
        const position = this.getPosition()
        const rotation = this.getRotation()

        // camera position
        const offset = new Vector3(0, 8, 15)
        offset.applyMatrix4(this.model.matrixWorld)
        game.camera.position.copy(offset)

        // camera rotation
        game.camera.rotation.y = rotation.y
        game.camera.rotation.x = rotation.x

    }

    getPosition() {
        return this.model.position
    }

    getRotation() {
        return this.model.rotation
    }

    getModel(): Object3D<Event> {
        return this.model
    }

    shot(): void {
        const rotation = this.getRotation()
        const velocity = new Vector3(
            -1 * Math.sin(rotation.y),
            1 * Math.sin(game.camera.rotation.x),
            -1 * Math.cos(rotation.y)
        )
        const pos = this.getPosition().clone().add(velocity.setLength(2))

        const ball = new Ball(true, pos, velocity.add(velocity.clone().setLength(MOVE_SPEED)), generateUUID())
        game.scene.add(ball.getMesh())
        game.balls.push(ball)
    }

    randomPos() {
        // random spawn point
        while (true) {
            const box3 = new Box3()
            game.mapBoundingBoxes!.forEach((each) => box3.union((each)))
            this.getPosition().set(
                (box3.max.x - box3.min.x) * Math.random() + box3.min.x,
                box3.max.y + 30 * Math.random(),
                (box3.max.z - box3.min.z) * Math.random() + box3.min.z
            )
            let bb_tank = this.getBB()
            if (!this.collisionCheck(bb_tank)) break
        }
    }


    removeEntity(): void {
        game.scene.remove(this.getModel())
    }
    addEntity(): void {
        game.scene.add(this.getModel())
    }

}