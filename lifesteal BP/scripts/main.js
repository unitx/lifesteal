import * as Mc from "@minecraft/server"
import * as Ui from "@minecraft/server-ui"
import {
    defaultAddonSetting, beaconBaseBlocks, formData, banId, banTag, recivedStartingHealthTag,
    spectoratorTag, craftingItemTimerProperty, validCraftingItem, processingCraftingItem
} from "./variables.js"
let updateState = {
    possibleCraftingItems: undefined,
    campFireRegeneration: undefined
}


export function updateGameState({ state, value }) { updateState[state] = value }
let encBooks = []
let oneSecondTimer = 0
const dimensions = ["overworld", "nether", "the_end"]
Mc.system.runInterval(() => {
    if (getAddonSetting("lifestealEnchantment") === true) {
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
    for (const player of Mc.world.getPlayers({ tags: [banTag] })) {
        if (Mc.world.getDynamicPropertyIds().includes(banId + player.name)) player.runCommand(`kick ${player.name} §cYou have lost your last life, You are banned!`)
        player.removeTag(banTag)
        respawn_player(player, undefined, undefined)
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

            if (state === undefined) updateState[key] = false
        }
        else if (state === true) {
            if (oneSecondTimer === 20) {
                if (key === "possibleCraftingItems") tryToCraftItem()
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
    let max = getPlayersMaxHealth(dieEntity)
    const healthLose = getAddonSetting("healthLose")
    if (Math.floor(max / 2) - healthLose > 0) {
        if (environmentalDeaths === false && attacker.typeId === "minecraft:player") setPlayersHealth({ player: dieEntity, hearts: Math.floor(max / 2) - healthLose })
        //dieEntity.triggerEvent("unitx:health" + (Math.floor(max / 2) - healthLose))
        if (environmentalDeaths === true) setPlayersHealth({ player: dieEntity, hearts: Math.floor(max / 2) - healthLose })
        //dieEntity.triggerEvent("unitx:health" + (Math.floor(max / 2) - healthLose))
        if (attacker === undefined) return
        if (attacker.typeId !== "minecraft:player") return
        if (dieEntity.nameTag === attacker.nameTag) return
        max = getPlayersMaxHealth(attacker)
        const healthGain = getAddonSetting("healthGain")
        const maxHealth = getAddonSetting("maxHealth")
        const chance = Math.floor(Math.random() * 100) + 1;
        const dropChance = getAddonSetting("heartTransferChance")
        if (dropChance === 0 || chance > dropChance) return
        if ((healthGain + (max / 2)) <= maxHealth) setPlayersHealth({ player: attacker, hearts: Math.round(healthGain + (max / 2)) })
        //attacker.triggerEvent("unitx:health" + (Math.round(healthGain + (max / 2))))
        else {
            if (getAddonSetting("dropAllHearts") === true) dieEntity.dimension.spawnItem(new Mc.ItemStack("unitx:heart", healthGain), dieEntity.location).clearVelocity()
            else if ((healthGain + (max / 2)) === maxHealth) setPlayersHealth({ player: attacker, hearts: maxHealth })
            //attacker.triggerEvent(`unitx:health` + maxHealth)
            else if ((healthGain + (max / 2)) > maxHealth) {
                //attacker.triggerEvent(`unitx:health` + maxHealth)
                setPlayersHealth({ player: attacker, hearts: maxHealth })
                const health = Math.floor((healthGain + (max / 2)) - maxHealth)
                dieEntity.dimension.spawnItem(new Mc.ItemStack("unitx:heart", health), dieEntity.location).clearVelocity()
            }
        }
    }
    else {
        if (getAddonSetting("finalDeathAnimation") === true) eventData.deadEntity.dimension.spawnEntity("lightning_bolt", { x: eventData.deadEntity.location.x, y: eventData.deadEntity.location.y + 3, z: eventData.deadEntity.location.z })
        if (getAddonSetting("dropSouls") === true) eventData.deadEntity.dimension.spawnItem(new Mc.ItemStack("unitx:revive_soul", 1), { x: eventData.deadEntity.location.x, y: eventData.deadEntity.location.y, z: eventData.deadEntity.location.z })
        const startingHealth = getAddonSetting("startingHealth")
        setPlayersHealth({ player: eventData.deadEntity, hearts: startingHealth })
        //eventData.deadEntity.triggerEvent("unitx:health" + startingHealth)
        const afterLastLife = getAddonSetting("afterLastLife")
        if (afterLastLife === 1) {
            eventData.deadEntity.addTag(spectoratorTag)
            eventData.deadEntity.setGameMode("spectator")
        }
        else if (afterLastLife === 2) {
            eventData.deadEntity.addTag(banTag)
            Mc.world.setDynamicProperty(banId + eventData.deadEntity.name, true)
        }
    }
})
Mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    if (eventData.initialSpawn === true) {
        if (eventData.player.hasTag(banTag)) {
            if (Mc.world.getDynamicPropertyIds().includes(banId + player.name)) return
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
            setPlayersHealth({ player: data.source, hearts: 1, withdraw: false, removeItem: { typeId: "unitx:heart", amount: 1 } })
        }
    })
    eventData.blockComponentRegistry.registerCustomComponent("unitx:break_beacon", {
        onPlayerDestroy(data) {
            let sound = true
            const baseSize = getAddonSetting("requiredBeaconBaseSize")
            for (let i = 1; i < baseSize + 1; i++) {
                if ([...data.dimension.getBlocks(new Mc.BlockVolume({ x: data.block.x + i, y: data.block.y - i, z: data.block.z + i }, { x: data.block.x - i, y: data.block.y - i, z: data.block.z - i }), { includeTypes: beaconBaseBlocks }).getBlockLocationIterator()].length !== (i * 2 + 1) ** 2) {
                    sound = false
                    break
                }
            }
            if (sound === true) data.block.dimension.playSound("beacon.activate", data.block.location)
        }
    })
})
Mc.world.afterEvents.playerInteractWithBlock.subscribe((data) => {
    if (!data.isFirstEvent) return
    if (data.block.typeId !== "unitx:revive_beacon") return
    if (data.player.isSneaking) return
    const baseSize = getAddonSetting("requiredBeaconBaseSize")
    for (let i = 1; i < baseSize + 1; i++) {
        if ([...data.block.dimension.getBlocks(new Mc.BlockVolume({ x: data.block.x + i, y: data.block.y - i, z: data.block.z + i }, { x: data.block.x - i, y: data.block.y - i, z: data.block.z - i }), { includeTypes: beaconBaseBlocks }).getBlockLocationIterator()].length !== (i * 2 + 1) ** 2) {
            data.player.sendMessage(`§cInvaild Beacon Base!`)
            return
        }
    }
    if (countItems(data.player, "unitx:revive_soul") <= 0) data.player.sendMessage(`§cA soul is requred!`)
    else openForm({ player: data.player, formKey: "mainReviveMenu", admin: false });
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
export function getPlayersMaxHealth(player) {
    let component = player.getComponent('minecraft:health')
    if (component === undefined) return 0
    let health1 = component.currentValue
    component.resetToMaxValue()
    let max = component.currentValue
    component.setCurrentValue(health1)
    return max
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
    if (health === undefined) health = getAddonSetting("respawnHearts")
    setPlayersHealth({ player: player, hearts: health })
    if (sound !== undefined) Mc.world.getAllPlayers().forEach(player => { player.playSound(sound) })
    try { player.removeTag("spectorator") } catch (e) { }
    try { player.removeTag(banTag) } catch (e) { }
    let spawnpoint = player.getSpawnPoint()
    if (spawnpoint === undefined) {
        spawnpoint = Mc.world.getDefaultSpawnLocation()
        spawnpoint.dimension = Mc.world.getDimension('overworld')
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
export async function openForm({ player, formKey, admin }) {
    let formConfig = formData[formKey]

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
        if (selectedButton.action) selectedButton.action(player, admin);

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
            } else if (field.id === "dropDown") {//dropdown
                let dropdownOptions = [];
                if (field.list === "onlinePlayers") {
                    dropdownOptions = Array.from(Mc.world.getPlayers({ gameMode: "spectator", tags: [spectoratorTag] }), p => p.name);
                    if (dropdownOptions.length === 0) {
                        player.sendMessage(`§cNo dead players online to revive!`);
                        return;
                    }
                } else dropdownOptions = field.list || [];
                let defaultValue = field.defaultValue
                if (defaultValue !== undefined) defaultValue = getAddonSetting(defaultValue);
                dropdownValues.push(dropdownOptions);
                form.dropdown(field.name, dropdownOptions, defaultValue);
            }
            else if (field.id === "toggle") { //toggles
                let defaultValue = field.defaultValue;
                let recipeKey = field.recipe;

                let recipeData
                if (defaultValue === "naturalregeneration") recipeData = Mc.world.gameRules.naturalRegeneration
                else recipeData = getAddonSetting(defaultValue);
                let toggleValue = recipeData[recipeKey]?.floorCrafting ?? recipeData;

                form.toggle(field.name, toggleValue);
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
            }
        };
        let response = await form.show(player);
        if (response.canceled) return;

        let responseIndex = 0;
        for (const field of elements) {
            if (field.hasOwnProperty("min")) {
                collectedResponses.push(response.formValues[responseIndex]);
                collectedResponses2.push(undefined);
            }
            else if (field.hasOwnProperty("list")) {
                let selectedIndex = response.formValues[responseIndex];
                collectedResponses2.push(selectedIndex);
                let selectedValue = dropdownValues.shift()[selectedIndex];
                collectedResponses.push(selectedValue);
            }
            else if (field.hasOwnProperty("state")) {
                collectedResponses.push(response.formValues[responseIndex]);
                collectedResponses2.push(undefined);
            }
            else {
                collectedResponses.push(response.formValues[responseIndex]);
                collectedResponses2.push(undefined);
            }
            responseIndex++;
        };
        if (formConfig.action) {
            formConfig.action({ player: player, response: collectedResponses, admin: admin, index: collectedResponses2[responseIndex] });
        }
        else {
            responseIndex = 0;
            for (const field of elements) {
                if (field.action) {
                    field.action({ player: player, response: collectedResponses[responseIndex], admin: admin, index: collectedResponses2[responseIndex] });
                }
                responseIndex++;
            };
        }
    }
}
export function setPlayersHealth({ player, hearts, withdraw = false, removeItem }) {
    const max = getPlayersMaxHealth(player)
    let newHealth=0
    if (withdraw === true) {
        if (hearts >= (max / 2)) {
            player.sendMessage(`§cInsufficient amount of hearts gain more hearts to withdraw §7${hearts} §chearts!`)
            return
        }
        newHealth = Math.floor(max / 2) - hearts
        player.triggerEvent("unitx:health" + newHealth)
        player.runCommand(`give @s unitx:heart ${hearts}`)
        player.sendMessage(`§aYou have withdrawn §7${hearts} §ahearts`)
        newHealth = newHealth * 2
    }
    else {
        Mc.world.sendMessage(`${max}`)
        if (removeItem !== undefined) {
            if (removeItems(player, removeItem.typeId, removeItem.amount) === false) return
            newHealth = Math.floor(max / 2) + hearts
            if (newHealth > max) {
                player.sendMessage(`§cMax health reached!`)
                return
            }
            player.triggerEvent("unitx:health" + newHealth)
        }
        else player.triggerEvent("unitx:health" + hearts)
        newHealth = newHealth * 2
    }
    let maxHealth = Mc.world.scoreboard.getObjective("lifesteal:maxhealth")
    if (maxHealth === undefined) maxHealth = Mc.world.scoreboard.addObjective("lifesteal:maxhealth")
    maxHealth.setScore(player, newHealth)
}