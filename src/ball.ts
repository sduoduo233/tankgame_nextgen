import { Box3, BoxGeometry, Camera, DoubleSide, Intersection, Mesh, MeshBasicMaterial, MeshStandardMaterial, Ray, Raycaster, ShortType, Side, SphereGeometry, TriangleStripDrawMode, Vector3 } from "three";
import { generateUUID } from "three/src/math/MathUtils";
import { game } from "./main";
import { PacketKill, PacketRemoveBall } from "./packets";

const MOVE_SPEED = 1
const MAX_TICKS = 30 * 5

export class Ball {

    private velocity: Vector3
    private pos: Vector3
    private mesh: Mesh

    private existedTicks = 0
    public id: string
    private clientSide: boolean
    public lastUpdate = 0

    private nextIntersection: Intersection | undefined

    constructor(clientSide: boolean, pos: Vector3, velocity: Vector3, id: string) {
        this.clientSide = clientSide
        this.id = id

        this.velocity = velocity.setLength(MOVE_SPEED)
        this.pos = pos
        this.mesh = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({ color: 0xff0000 }))
        this.mesh.position.copy(pos)
        this.mesh.castShadow = true

        this.calcReflectPoint()

        if (this.clientSide) game.network.updateClientBall(this)
    }

    update() {
        // move 3 times per tick with small movement each move
        // so collision & intersection detection will not be skipped
        for (let i = 0; i < 3; i++) {

            if (this.nextIntersection !== undefined) {
                let d = this.pos.distanceTo(this.nextIntersection.point);
                if (d < 5) {
                    this.velocity.addScaledVector(this.nextIntersection.face!.normal, - this.nextIntersection.face!.normal.dot(this.velocity) * 2)
                    this.calcReflectPoint()
        
                    if (this.clientSide)
                        game.network.updateClientBall(this)
                }
            }
    
            this.pos.add(this.velocity)
            this.mesh.position.copy(this.pos)
    
            this.existedTicks++

            // kill
            if (this.clientSide) {
                const box3 = new Box3()
                box3.expandByObject(this.mesh)
                game.remoteEntities.forEach((remoteEntity) => {
                    if (remoteEntity.getBB().intersectsBox(box3)) {
                        game.network.send(new PacketKill(remoteEntity.getId()))
                        game.ranking.addKill("You")
                        this.removeSelf()
                    }
                })
                if (this.existedTicks > 5 && game.thePlayer!.getBB().intersectsBox(box3)) {
                    game.kill()
                    this.removeSelf()
                    game.ranking.addDeath("You")
                }
            }
        }
        
        

        if (this.existedTicks > MAX_TICKS) {
            if (this.clientSide) {
                this.removeSelf()
            }
            else {
                game.removeRemoteBall(this)
                game.scene.remove(this.mesh)
            }
        }

        
    }

    removeSelf() {
        game.network.send(new PacketRemoveBall(this.id))
        game.removeClientBall(this)
        game.scene.remove(this.mesh)
    }

    calcReflectPoint() {
        const intersection = game.map!.raycastFirst(new Ray(this.pos, this.velocity.clone().normalize()), DoubleSide);
        
        if (intersection.distance < 3000) {
            this.nextIntersection = intersection
        } else {
            this.nextIntersection = undefined
        }
    }

    getMesh() {
        return this.mesh
    }

    getPosition() {
        return this.pos
    }

    getVelocity() {
        return this.velocity
    }
}
