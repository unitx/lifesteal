import * as Mc from "@minecraft/server"
import * as Ui from "@minecraft/server-ui"
import {
    defaultAddonSetting, beaconBaseBlocks, formData, banId, banTag, recivedStartingHealthTag,
    spectoratorTag, craftingItemTimerProperty, validCraftingItem, processingCraftingItem, spectoratorId, changeHealthId
} from "./variables.js"
let updateState = {
    possibleCraftingItems: undefined,
    campFireRegeneration: undefined,
    lifeStealEnchantment: undefined
}

export function updateGameState({ state, value }) { updateState[state] = value }
let encBooks = []
let oneSecondTimer = 0
export const dimensions = ["overworld", "nether", "the_end"]

Mc.system.runInterval(() => {
    for (const player of Mc.world.getPlayers({ tags: [banTag] })) {
        let propId = Mc.world.getDynamicProperty(banId + player.name)
        if (propId !== undefined) {
            player.runCommand(`kick ${player.name} §cYou have lost your last life, You are banned!`)
            continue
        }
        const health = Mc.world.getDynamicProperty(changeHealthId + player.name)
        if (health !== undefined) Mc.world.setDynamicProperty(changeHealthId + player.name, undefined)
        player.removeTag(banTag)
        respawn_player(player, health, undefined)
    }
    for (const player of Mc.world.getPlayers({ tags: [spectoratorTag] })) {
        let propId = Mc.world.getDynamicProperty(spectoratorId + player.name)
        if (propId !== undefined) continue
        const health = Mc.world.getDynamicProperty(changeHealthId + player.name)
        if (health !== undefined) Mc.world.setDynamicProperty(changeHealthId + player.name, undefined)
        player.removeTag(spectoratorTag)
        respawn_player(player, health, undefined)
    }
    for (const player of Mc.world.getPlayers({ excludeTags: [recivedStartingHealthTag] })) {
        if (getAddonSetting("randomHearts") === true) {
            const min = getAddonSetting("minRandomHearts")
            const random = Math.floor(Math.random() * (getAddonSetting("maxRandomHearts") - min) + min)
            setPlayersHealth({ player: player, hearts: random })
            //player.triggerEvent("unitx:health" + random)
        }
        else setPlayersHealth({ player: player, hearts: getAddonSetting("startingHealth") })
        //player.triggerEvent("unitx:health" + getAddonSetting("startingHealth"))
        player.addTag(recivedStartingHealthTag)
    }
    for (let [key, state] of Object.entries(updateState)) {
        if (state === undefined) {
            if (key === "possibleCraftingItems") {
                for (const recipe of Object.values(getAddonSetting("recipes"))) {
                    if (recipe.floorCrafting === false) continue
                    updateState[key] = true
                    state = true
                    break
                }
            }
            else if (key === "campFireRegeneration") {
                state = getAddonSetting("campFireRegeneration")
                updateState[key] = state
            }
            else if (key === "lifeStealEnchantment") {
                state = getAddonSetting("lifestealEnchantment")
                updateState[key] = state
            }

            if (state === undefined) updateState[key] = false
        }
        else if (state === true) {
            if (oneSecondTimer === 20) {
                if (key === "possibleCraftingItems") tryToCraftItem()
                else if (key === "lifeStealEnchantment") tryEnchantmentOperation()
                else if (key === "campFireRegeneration") {
                    for (const player of Mc.world.getPlayers()) {
                        if (player.dimension.containsBlock(new Mc.BlockVolume({ x: player.location.x - 3, y: player.location.y - 3, z: player.location.z - 3 }, { x: player.location.x + 3, y: player.location.y + 3, z: player.location.z + 3 }), { includeTypes: ["minecraft:campfire", "minecraft:soul_campfire"] }, true) === true) {
                            player.addEffect("regeneration", 60, { amplifier: 0 })
                        }
                    }
                }
            }
        }
    }
    if (oneSecondTimer >= 20) oneSecondTimer = 0
    oneSecondTimer++
})
Mc.world.afterEvents.entityDie.subscribe((eventData) => {
    const attacker = eventData.damageSource.damagingEntity
    const dieEntity = eventData.deadEntity
    if (dieEntity.typeId !== 'minecraft:player') return

    const environmentalDeaths = getAddonSetting("environmentalDeaths")
    if (environmentalDeaths === false && attacker === undefined) return
    if (environmentalDeaths === false && attacker.typeId !== 'minecraft:player') return
    const maxHeartsDiedEntity = getPlayersMaxHealth(dieEntity)
    const healthLose = getAddonSetting("healthLose")

    if (Math.floor(maxHeartsDiedEntity / 2) - healthLose > 0) {
        if (environmentalDeaths === false && attacker.typeId === "minecraft:player") setPlayersHealth({ player: dieEntity, hearts: Math.floor(maxHeartsDiedEntity / 2) - healthLose })
        else if (environmentalDeaths === true) setPlayersHealth({ player: dieEntity, hearts: Math.floor(maxHeartsDiedEntity / 2) - healthLose })
    }
    else handlePlayerDeath()
    if (attacker === undefined) return
    if (attacker.typeId !== "minecraft:player") return
    if (dieEntity.nameTag === attacker.nameTag) return
    const maxHeartsAttackingEntity = getPlayersMaxHealth(attacker)
    const healthGain = getAddonSetting("healthGain")
    const maxHealth = getAddonSetting("maxHealth")

    const chance = Math.floor(Math.random() * 100) + 1;
    const dropChance = getAddonSetting("heartTransferChance")
    if (dropChance === 0 || chance > dropChance) return

    if (getAddonSetting("dropAllHearts") === true) dieEntity.dimension.spawnItem(new Mc.ItemStack("unitx:heart", healthGain), dieEntity.location)
    else if ((healthGain + (maxHeartsAttackingEntity / 2)) < maxHealth) setPlayersHealth({ player: attacker, hearts: (Math.floor(maxHeartsAttackingEntity / 2) + healthGain) })
    else {
        setPlayersHealth({ player: attacker, hearts: maxHealth, set: false })
        dieEntity.dimension.spawnItem(new Mc.ItemStack("unitx:heart", maxHealth + healthGain - Math.floor(maxHeartsAttackingEntity / 2)), dieEntity.location)
    }
    function handlePlayerDeath() {
        if (getAddonSetting("finalDeathAnimation") === true) dieEntity.dimension.spawnEntity("lightning_bolt", { x: dieEntity.location.x, y: dieEntity.location.y + 3, z: dieEntity.location.z })
        if (getAddonSetting("dropSouls") === true) dieEntity.dimension.spawnItem(new Mc.ItemStack("unitx:revive_soul", 1), { x: dieEntity.location.x, y: dieEntity.location.y, z: dieEntity.location.z })
        const startingHearts = getAddonSetting("respawnHearts")
        setPlayersHealth({ player: dieEntity, hearts: startingHearts })
        const afterLastLife = getAddonSetting("afterLastLife")
        if (afterLastLife === 1) {
            dieEntity.addTag(spectoratorTag)
            Mc.world.setDynamicProperty(spectoratorId + dieEntity.name, true)
            dieEntity.setGameMode("spectator")
        }
        else if (afterLastLife === 2) {
            dieEntity.addTag(banTag)
            Mc.world.setDynamicProperty(banId + dieEntity.name, true)
        }
    }
})
Mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    if (eventData.initialSpawn === true) {
        if (eventData.player.hasTag(banTag)) {
            if (Mc.world.getDynamicPropertyIds().includes(banId + eventData.player.name)) return
            respawn_player(eventData.player, undefined, undefined)
        }
        const max = getAddonSetting("maxHealth")
        if (getPlayersMaxHealth(eventData.player) > max) setPlayersHealth({ player: eventData.player, hearts: max })
    }
    let maxHealth = Mc.world.scoreboard.getObjective("lifesteal:maxhealth")
    if (maxHealth === undefined) maxHealth = Mc.world.scoreboard.addObjective("lifesteal:maxhealth")
    maxHealth.setScore(eventData.player, getPlayersMaxHealth(eventData.player))
})
Mc.world.afterEvents.entitySpawn.subscribe((eventData) => {
    let entity = eventData.entity
    if (entity.typeId !== "minecraft:item") return
    let component = entity.getComponent('item')
    if (component === undefined) return
    component = component.itemStack
    if (component === undefined) return
    if (component.typeId === "unitx:lifesteal1" || component.typeId === "unitx:lifesteal2" || component.typeId === "unitx:lifesteal3") {
        entity.setDynamicProperty('lifesteal_enchantment', true)
        encBooks.push(entity.id)
    }
    else {
        for (const recipe of Object.values(getAddonSetting("recipes"))) {
            if (recipe.floorCrafting === false) continue
            let shortTypeId = component.typeId.includes(":") ? component.typeId.split(":")[1] : component.typeId;
            if (!recipe.ingredients.includes(component.typeId) && !recipe.ingredients.includes(shortTypeId)) continue;
            entity.addTag(processingCraftingItem)
            entity.addTag(validCraftingItem)
        }
    }
})
Mc.system.afterEvents.scriptEventReceive.subscribe((eventData) => {
    const player = eventData.sourceEntity
    if (player.typeId !== "minecraft:player") return
    if (eventData.id === "unitx:withdraw") {
        let value = parseInt(eventData.message.replaceAll(' ', ''))
        if (isNaN(value) || value == undefined) value = 1
        value = Math.floor(value)
        if (value < 1) {
            player.sendMessage(`§cInvalid range expected §71 - 50`)
            return
        }
        setPlayersHealth({ player: player, hearts: value, withdraw: true })
    }
    else if (eventData.id === "unitx:withdraw_gui") {
        const max = getPlayersMaxHealth(player)
        if ((max / 2) < 2) {
            player.sendMessage(`§cInsufficient amount of hearts gain more hearts to withdraw hearts!`)
            return
        }
        openForm({ player: player, formKey: "withdrawHearts", admin: max })
    }
})
Mc.world.beforeEvents.worldInitialize.subscribe((eventData) => {
    eventData.blockComponentRegistry.registerCustomComponent("unitx:beacon_gui", {
        onPlayerInteract(data) { }
    })
    eventData.itemComponentRegistry.registerCustomComponent("unitx:settings_menu", {
        onUse(data) {
            if (data.source.typeId !== "minecraft:player") return
            openForm({ player: data.source, formKey: "mainSettingsMenu", admin: true });
        }
    })
    eventData.itemComponentRegistry.registerCustomComponent("unitx:heart", {
        onUse(data) {
            if (data.source.typeId !== "minecraft:player") return
            setPlayersHealth({ player: data.source, hearts: 1, removeItem: { typeId: "unitx:heart", amount: 1 }, set: false })
        }
    })
    eventData.itemComponentRegistry.registerCustomComponent("unitx:heart_apple", {
        onCompleteUse(data) {
            if (data.source.typeId !== "minecraft:player") return
            let level = 0
            for (const effect of data.source.getEffects()) {
                if (effect.typeId !== "health_boost") continue
                level = effect.amplifier
                level++
                break
            }
            data.source.addEffect("health_boost", 6000, { amplifier: level })
        }
    })
    eventData.blockComponentRegistry.registerCustomComponent("unitx:break_beacon", {
        onPlayerDestroy(data) {
            for (const entity of data.dimension.getEntities({ location: { x: data.block.location.x + 0.5, y: data.block.location.y, z: data.block.location.z + 0.5 }, maxDistance: 0.2, type: "unitx:revive_beacon_beam" })) {
                entity.remove()
            }
        }
    })
    eventData.blockComponentRegistry.registerCustomComponent("unitx:beacon_tick", {
        onTick(data) {
            const location = data.block.center()
            const entitys = data.dimension.getEntities({ location: { x: location.x - 0.5, y: location.y - 0.5, z: location.z - 0.5 }, volume: { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 }, type: "unitx:revive_beacon_beam" })
            if (entitys.length > 1) for (let i = 1; i < entitys.length; i++) entitys[i].remove()
            if (getAddonSetting("beaconEffects") === false) {
                let removed = false
                for (const entity of entitys) {
                    entity.remove()
                    removed = true
                }
                if (removed === true) data.block.dimension.playSound("beacon.deactivate", location)
                return

            }
            const baseSize = getAddonSetting("requiredBeaconBaseSize")
            const raycast = data.dimension.getTopmostBlock({ x: data.block.location.x, z: data.block.location.z })
            if (raycast === undefined || raycast.typeId !== "unitx:revive_beacon" || raycast.location.y !== data.block.y) {
                for (const entity of entitys) entity.remove()
                return
            }
            for (let i = 1; i < baseSize + 1; i++) {
                if ([...data.dimension.getBlocks(new Mc.BlockVolume({ x: data.block.x + i, y: data.block.y - i, z: data.block.z + i }, { x: data.block.x - i, y: data.block.y - i, z: data.block.z - i }), { includeTypes: beaconBaseBlocks }).getBlockLocationIterator()].length !== (i * 2 + 1) ** 2) {
                    let removed = false
                    for (const entity of entitys) {
                        entity.remove()
                        removed = true
                    }
                    if (removed === true) data.block.dimension.playSound("beacon.deactivate", location)
                    return
                }
            }
            data.block.dimension.playSound("beacon.ambient", location)
            if (entitys.length > 0) return
            const entity = data.dimension.spawnEntity("unitx:revive_beacon_beam", location)
            const maxHeight = data.block.dimension.heightRange.max
            const numberOfBeams = Math.floor((maxHeight - data.block.location.y) / 32)
            let heightOfHighestBeam = data.block.location.y + 32 * numberOfBeams
            let currentHeight = 32 * numberOfBeams
            entity.setProperty("unitx:height", numberOfBeams)
            const beamSizes = [16, 8, 4, 2, 1];
            for (let i = 0; i < beamSizes.length; i++) {
                const segmentSize = beamSizes[i];
                if (maxHeight - heightOfHighestBeam >= segmentSize) {
                    entity.setProperty(`unitx:beam_${segmentSize}`, currentHeight * 16);
                    currentHeight += segmentSize;  
                    heightOfHighestBeam += segmentSize;
                } else entity.setProperty(`unitx:beam_${segmentSize}`, -1);
            }
            if (data.block.location.y === maxHeight - 1) {
                entity.setProperty("unitx:beam_16", -1);
                entity.setProperty("unitx:beam_8", -1);
                entity.setProperty("unitx:beam_4", -1);
                entity.setProperty("unitx:beam_2", -1);
                entity.setProperty("unitx:beam_1", -1);
            }
            data.block.dimension.playSound("beacon.activate", location)
        }
    })
})
Mc.world.afterEvents.playerInteractWithBlock.subscribe((data) => {
    if (!data.isFirstEvent) return
    if (data.block.typeId !== "unitx:revive_beacon") return
    if (data.player.isSneaking) return

    if (getAddonSetting("beaconEffects") === true) {
        const entitys = data.block.dimension.getEntities({ location: data.block.center(), maxDistance: 0.5, type: "unitx:revive_beacon_beam" })
        if (entitys.length === 0) return
    }
    else {
        const baseSize = getAddonSetting("requiredBeaconBaseSize")
        for (let i = 1; i < baseSize + 1; i++) {
            if ([...data.block.dimension.getBlocks(new Mc.BlockVolume({ x: data.block.x + i, y: data.block.y - i, z: data.block.z + i }, { x: data.block.x - i, y: data.block.y - i, z: data.block.z - i }), { includeTypes: beaconBaseBlocks }).getBlockLocationIterator()].length !== (i * 2 + 1) ** 2) {
                data.player.sendMessage("§cInvalid beacon base!")
                return
            }
        }
    }
    if (data.player.getGameMode() !== "creative") {
        if (countItems(data.player, "unitx:revive_soul") <= 0) {
            data.player.sendMessage(`§cA soul is requred!`)
            return
        }
    }
    openForm({ player: data.player, formKey: "reviveTypeMenu", admin: false, location: data.block.location });
})
Mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    if (getAddonSetting("lifestealEnchantment") === false) return
    let damage = eventData.damage, hurtEntity = eventData.hurtEntity, damagingEntity = eventData.damageSource.damagingEntity
    if (damage === undefined || hurtEntity === undefined || damagingEntity === undefined) return
    if (damagingEntity.typeId !== "minecraft:player") return
    let itemStack = damagingEntity.getComponent('minecraft:equippable').getEquipmentSlot("Mainhand")
    if (itemStack === undefined) return
    let value = itemStack.getDynamicProperty("lifesteal")
    if (value === undefined) return
    let stealAmount = getAddonSetting("healthStealAmountPerLevel")
    const random = Math.floor(Math.random() * 100) + 1;
    if (random > getAddonSetting("healthStealChance")) return
    stealAmount = stealAmount * value
    if (getAddonSetting("lifestealDamageScaled") === true) damage = damage * (stealAmount / 10)
    else damage = stealAmount
    regenHealth(damagingEntity, damage)
})
Mc.world.afterEvents.playerBreakBlock.subscribe((eventData) => {
    if (!eventData.brokenBlockPermutation.matches("minecraft:oak_leaves") && !eventData.brokenBlockPermutation.matches("minecraft:dark_oak_leaves")) return
    if (eventData.player.getGameMode() === "creative") return
    if (Mc.world.gameRules.doTileDrops === false) return
    if (eventData.itemStackBeforeBreak !== undefined) {
        if (eventData.itemStackBeforeBreak.typeId === "minecraft:shears") return
        let enc = eventData.itemStackBeforeBreak.getComponent("minecraft:enchantable")
        if (enc !== undefined) {
            if (enc.hasEnchantment("silk_touch")) return
        }
    }
    if ((Math.random() * (100 - 0.1) + 0.1) <= getAddonSetting("heartAppleChance")) eventData.dimension.spawnItem(new Mc.ItemStack("unitx:heart_apple", 1), { x: eventData.block.location.x + 0.5, y: eventData.block.location.y + 0.5, z: eventData.block.location.z + 0.5 })
})

function tryEnchantmentOperation() {
    for (let i = encBooks.length - 1; i >= 0; i--) {
        let entityBook = Mc.world.getEntity(encBooks[i]);
        if (!entityBook?.isOnGround) continue;
        entityBook.setDynamicProperty("lifesteal_enchantment", undefined);
        encBooks.splice(i, 1);
        entityBook.dimension.getEntities({
            maxDistance: 1, closest: 1, type: "minecraft:item", location: entityBook.location, minDistance: 0.001
        }).forEach(item => {
            let component = item.getComponent('item')?.itemStack;
            if (!component || component.isStackable) return;

            let com = entityBook.getComponent("item")?.itemStack;
            if (!com) return;

            let nextLevel = {
                "unitx:lifesteal1": "unitx:lifesteal2",
                "unitx:lifesteal2": "unitx:lifesteal3"
            }[com.typeId];

            if (nextLevel && com.typeId === component.typeId) {
                item.dimension.spawnItem(new Mc.ItemStack(nextLevel, 1), item.location).clearVelocity();
                item.kill();
                entityBook.kill();
                return;
            }
            if (!component.typeId.includes('axe')) return;
            let bookLevel = { "unitx:lifesteal1": 1, "unitx:lifesteal2": 2, "unitx:lifesteal3": 3 }[com.typeId] || 0;
            let currentLevel = component.getDynamicProperty("lifesteal") || 0;
            if (bookLevel <= currentLevel) return;
            currentLevel = bookLevel === currentLevel ? currentLevel + 1 : bookLevel;
            if (currentLevel >= 4) return;
            let levelSyntax = ["", "I", "II", "III"][currentLevel];
            component.setDynamicProperty("lifesteal", currentLevel);
            component.setLore([`§r§7Lifesteal ${levelSyntax}`]);
            item.dimension.spawnItem(component, item.location).clearVelocity();
            item.kill();
            entityBook.kill();
        });
    }
    for (const entity of Mc.world.getDimension('overworld').getEntities()) {
        if (entity.typeId === "minecraft:item" && entity.getDynamicProperty("lifesteal_enchantment") && entity.isOnGround) {
            entity.setDynamicProperty("lifesteal_enchantment", undefined);
        }
    }
}
function tryToCraftItem() {
    for (const dim of dimensions) {
        for (const entity of Mc.world.getDimension(dim).getEntities({ tags: [processingCraftingItem] })) {
            if (!entity.isValid()) continue
            const location = entity.location
            const dimension = entity.dimension
            let itemData = {}
            const entitys2 = Mc.world.getDimension(dim).getEntities({ tags: [validCraftingItem], location: entity.location, maxDistance: 0.5 })
            for (const entity2 of entitys2) {
                let component = entity2.getComponent('item')?.itemStack;
                if (!component) continue
                if (itemData[component.typeId] !== undefined) itemData[component.typeId] = itemData[component.typeId] + component.amount
                else itemData[component.typeId] = component.amount
            }
            let itemData2 = {}
            for (const recipes of Object.values(getAddonSetting("recipes"))) {
                if (recipes.floorCrafting === false) continue
                const recipe = recipes.ingredients
                for (let i = recipe.length - 1; i >= 0; i--) {
                    let item = recipe[i]
                    if (item === "minecraft:air" || item === "air" || item === "undefined" || item === undefined || item === "" || item === " ") {
                        recipe.splice(i, 1)
                    }
                    else {
                        if (itemData[item.split(":", 1)[1]] !== undefined) item = item.split(":", 1)[1]
                        if (itemData[item] !== undefined) {
                            if (!itemData2[item]) itemData2[item] = 0;
                            itemData2[item] += 1;
                            if (itemData[item] === 1) delete itemData[item]
                            else itemData[item] = itemData[item] - 1
                            recipe.splice(i, 1)
                        }
                    }
                }
                if (recipe.length === 0) {
                    for (const entity2 of entitys2) {
                        let component = entity2.getComponent('item')?.itemStack;
                        if (!component) continue
                        if (itemData2[component.typeId] === undefined) continue

                        if (itemData2[component.typeId] < component.amount) {
                            const dimension = entity2.dimension
                            const location = entity2.location
                            component.amount = component.amount - itemData2[component.typeId]
                            entity2.kill()
                            dimension.spawnItem(component, location).clearVelocity()
                            delete itemData2[component.typeId]
                        }
                        else {
                            itemData2[component.typeId] -= component.amount;
                            entity2.kill();
                        }
                    }
                    dimension.spawnItem(new Mc.ItemStack(recipes.result, 1), location).clearVelocity()
                    dimension.spawnParticle("minecraft:cauldron_explosion_emitter", location)
                }
            }

            if (!entity.isValid()) continue

            let timer = entity.getDynamicProperty(craftingItemTimerProperty)
            if (timer === undefined) entity.setDynamicProperty(craftingItemTimerProperty, 3)
            else if (timer <= 0) {
                entity.setDynamicProperty(craftingItemTimerProperty, undefined)
                entity.removeTag(processingCraftingItem)
            }
            else entity.setDynamicProperty(craftingItemTimerProperty, timer - 1)
        }
    }
}
function regenHealth(player, amount) {
    let max = getPlayersMaxHealth(player)
    let component = player.getComponent('minecraft:health')
    if (component.currentValue + amount < max) component.setCurrentValue(component.currentValue + amount)
    else if (component.currentValue !== max) component.resetToMaxValue()
}
export function getAddonSetting(id) {
    let value = Mc.world.getDynamicProperty(id);
    if (value === undefined) {
        value = defaultAddonSetting[id];
        if (typeof value === "object") value = JSON.stringify(value);
        Mc.world.setDynamicProperty(id, value);
    }
    if (typeof value !== "string") return value
    return JSON.parse(value);
}
export function countItems(player, typeId) {
    let count = 0
    let inventory = player.getComponent("minecraft:inventory")
    if (inventory === undefined) return 0
    inventory = inventory.container
    if (inventory === undefined) return 0
    for (let i = 0; i < inventory.size; i++) {
        let item = inventory.getItem(i)
        if (!item) continue
        if (item.typeId === typeId) count = +item.amount
    }
    return count
}
export function respawn_player(player, health, sound) {
    player.setGameMode("survival")
    if (health === undefined) {
        if (getAddonSetting("randomRespawnHearts") === false) health = getAddonSetting("respawnHearts")
        else {
            const min = getAddonSetting("minRandomRespawnHearts")
            health = Math.floor(Math.random() * (getAddonSetting("maxRandomRespawnHearts") - min + 1)) + min
            Mc.world.sendMessage(`${health} ${getAddonSetting("maxRandomRespawnHearts")} ${min}`)
        }
    }
    setPlayersHealth({ player: player, hearts: health })
    if (sound !== undefined) Mc.world.getAllPlayers().forEach(player => { player.playSound(sound) })
    try { player.removeTag("spectorator") } catch (e) { }
    try { player.removeTag(banTag) } catch (e) { }
    let spawnpoint = player.getSpawnPoint()
    if (spawnpoint === undefined) {
        spawnpoint = Mc.world.getDefaultSpawnLocation()
        spawnpoint.dimension = Mc.world.getDimension("overworld")
    }
    if (spawnpoint === undefined) {
        spawnpoint = { x: 0, y: 320, z: 0, dimension: Mc.world.getDimension("overworld") }
        player.addEffect("resistance", 200, { amplifier: 20, showParticles: false })
    }
    if (spawnpoint.y >= 32000) {
        spawnpoint.y = 320
        player.addEffect("resistance", 200, { amplifier: 20, showParticles: false })
    }
    player.teleport({ x: spawnpoint.x, y: spawnpoint.y, z: spawnpoint.z }, { dimension: spawnpoint.dimension });
}
export function removeItems(player, typeId, count) {
    let inventory = player.getComponent("minecraft:inventory")
    if (inventory === undefined) return false
    inventory = inventory.container
    if (inventory === undefined) return false
    for (let i = 0; i < inventory.size; i++) {
        let item = inventory.getItem(i)
        if (!item) continue
        if (item.typeId === typeId) {
            if (count < item.amount) {
                item.amount = item.amount - count
                inventory.setItem(i, item)
                return true
            }
            else if (count === item.amount) {
                inventory.setItem(i, undefined)
                return true
            }
            else {
                inventory.setItem(i, undefined)
                count = count - item.amount
            }
        }
    }
    if (count > 0) return false
}
export async function openForm({ player, formKey, admin, location }) {
    let formConfig = formData[formKey]
    let formDataResponse = []
    let form;
    if (formConfig.type === "actionFormData") {
        form = new Ui.ActionFormData().title(formConfig.title);
        if (formConfig.body) form.body(formConfig.body);

        let elements = [...(formConfig.buttons || [])].filter(e => !e.admin || admin);
        elements.sort((a, b) => a.placement - b.placement);

        elements.forEach(button => {
            form.button(button.name, button.texture);
        });

        let response = await form.show(player);
        if (response.canceled) return;

        let selectedButton = elements[response.selection];
        if (selectedButton.action) selectedButton.action(player, admin, location);

    }
    else if (formConfig.type === "modalFormData") {
        form = new Ui.ModalFormData().title(formConfig.title);
        let dropdownValues = [];
        let collectedResponses = [];
        let collectedResponses2 = []
        let elements = [
            ...(formConfig.textField || []),
            ...(formConfig.dropdown || []),
            ...(formConfig.slider || []),
            ...(formConfig.toggle || [])
        ].filter(e => !e.admin || admin);

        elements.sort((a, b) => a.placement - b.placement);
        let count = 0
        for (const [value, field] of Object.entries(elements)) {
            if (field.id === "slider") {//slider
                let defaultValue = field.defaultValue;
                let max = field.max;
                if (defaultAddonSetting[defaultValue] !== undefined) defaultValue = getAddonSetting(defaultValue);
                if (max === "playersHealth") max = (Math.floor(admin / 2) - 1) || 1
                form.slider(field.name, field.min, max, field.step, defaultValue);
                formDataResponse.push({ sliderMin: field.min, sliderMax: max })
            }
            else if (field.id === "dropDown") {//dropdown
                let dropdownOptions = [];
                let data = []
                if (field.list === "onlinePlayers") {
                    dropdownOptions = Array.from(Mc.world.getPlayers({ gameMode: "spectator", tags: [spectoratorTag] }), p => p.name);
                    if (dropdownOptions.length === 0) {
                        player.sendMessage(`§cNo dead players online to revive!`);
                        return;
                    }
                }
                else if (field.list === "fallenPlayers") {
                    dropdownOptions = Mc.world.getDynamicPropertyIds()
                    data = [...dropdownOptions]
                    for (let i = dropdownOptions.length - 1; i >= 0; i--) {
                        if (!dropdownOptions[i].includes(spectoratorId) && !dropdownOptions[i].includes(banId)) {
                            dropdownOptions.splice(i, 1)
                            data.splice(i, 1)
                            continue
                        }
                        const split = dropdownOptions[i].split(":", 2)
                        if (admin === true) {
                            if (dropdownOptions[i].includes(banId)) dropdownOptions[i] = split[1] + " " + "-" + " " + "§cbanned"
                            else if (dropdownOptions[i].includes(spectoratorId)) dropdownOptions[i] = split[1] + " " + "-" + " " + "§cspectorator"
                        }
                        else dropdownOptions[i] = split[1]
                    }
                    if (dropdownOptions.length === 0) {
                        player.sendMessage(`§cNo player has lost thier last life yet!`);
                        return;
                    }
                }
                else dropdownOptions = field.list || [];
                let defaultValue = field.defaultValue
                if (defaultValue !== undefined) defaultValue = getAddonSetting(defaultValue);
                dropdownValues.push(dropdownOptions);
                form.dropdown(field.name, dropdownOptions, defaultValue);
                formDataResponse.push({ inputDropDownData: data, shownDropDownData: dropdownOptions })
            }
            else if (field.id === "toggle") {//toggles
                let defaultValue = field.defaultValue;
                let recipeKey = field.recipe;

                let recipeData
                if (defaultValue === "naturalregeneration") recipeData = Mc.world.gameRules.naturalRegeneration
                else recipeData = getAddonSetting(defaultValue);
                if (recipeData === undefined) recipeData = defaultValue
                let toggleValue = recipeData[recipeKey]?.floorCrafting ?? recipeData;

                form.toggle(field.name, toggleValue);
                formDataResponse.push({ toggleState: toggleValue })
            }
            else if (field.id === "textField") {//text box
                let data = ""
                if (field.defaultValue !== undefined) {
                    if (field.recipe !== undefined) data = getAddonSetting(field.defaultValue)[field.recipe].ingredients[count]
                    else data = getAddonSetting(field.defaultValue)[count]
                }
                if (data === "air" || data === "minecraft:air" || data === "undefined" || data === undefined) data = ""
                form.textField(field.name, "", data);
                count++
                formDataResponse.push({ defaultText: data })
            }
        };
        let response = await form.show(player);
        if (response.canceled) return;

        let responseIndex = 0;
        for (let i = 0; i <= elements.length; i++) {
            try { formDataResponse[i].inputData = response.formValues[i] } catch (e) { }//input data like slider value or index of array
            responseIndex++;
        }
        if (formConfig.action) {
            formConfig.action({ player: player, response: collectedResponses, admin: admin, index: collectedResponses2[responseIndex], formDataResponse: formDataResponse, location: location });
        }
        else {
            responseIndex = 0;
            for (const field of elements) {
                if (field.action) {
                    field.action({ player: player, response: collectedResponses[responseIndex], admin: admin, index: collectedResponses2[responseIndex], formDataResponse: formDataResponse[responseIndex], location: location });
                }
                responseIndex++;
            };
        }
    }
}
export function getPlayersMaxHealth(player) {
    let component = player.getComponent('minecraft:health')
    if (component === undefined) return 0
    return component.defaultValue
}
export function setPlayersHealth({ player, hearts, withdraw = false, removeItem, set = true }) {
    const allowdMax = getAddonSetting("maxHealth")
    const max = getPlayersMaxHealth(player)
    let newHealth = 0
    if (withdraw === true) {
        if (hearts >= (max / 2)) {
            player.sendMessage(`§cInsufficient amount of hearts gain more hearts to withdraw §7${hearts} §hearts!`)
            return
        }
        newHealth = Math.floor(max / 2) - hearts
        player.triggerEvent("unitx:health" + newHealth)
        player.runCommand(`give @s unitx:heart ${hearts}`)
        player.sendMessage(`§aYou have withdrawn §7${hearts} §ahearts`)
        newHealth = newHealth * 2
    }
    else {
        if (set === true) newHealth = hearts
        else newHealth = Math.floor(max / 2) + hearts
        if (newHealth > allowdMax) {
            player.triggerEvent("unitx:health" + allowdMax)
            player.sendMessage(`§cMax health reached!`)
            return
        }
        if (removeItem !== undefined) {
            if (removeItems(player, removeItem.typeId, removeItem.amount) === false) return
            player.triggerEvent("unitx:health" + newHealth)
        }
        else player.triggerEvent("unitx:health" + newHealth)
        newHealth = newHealth * 2
    }
    let maxHealth = Mc.world.scoreboard.getObjective("lifesteal:maxhealth")
    if (maxHealth === undefined) maxHealth = Mc.world.scoreboard.addObjective("lifesteal:maxhealth")
    maxHealth.setScore(player, newHealth)
}
function resetDefaultSettings() {
    for (const [key, value] of Object.entries(defaultAddonSetting)) {
        if (key === "recipes") Mc.world.setDynamicProperty(key, JSON.stringify(value))
        else Mc.world.setDynamicProperty(key, value)
    }
}