import * as Mc from "@minecraft/server"
import { getAddonSetting, respawn_player, removeItems, openForm, getPlayersMaxHealth, updateGameState, setPlayersHealth } from "./main.js"

export const banId = "unitxLifestealBan:"
export const banTag = "unitxLifesteal:banned"
export const spectoratorTag = "unitxLifesteal:spectorator"
export const recivedStartingHealthTag = "unitxLifesteal:startingHealth"
export const processingCraftingItem = "unitxLifesteal:validCraftingItemProcessing"
export const validCraftingItem = "unitxLifesteal:validCraftingItem"
export const craftingItemTimerProperty = "unitxLifesteal:craftingItemTimer"
export const defaultAddonSetting = {
    startingHealth: 10,
    maxHealth: 30,
    healthGain: 1,
    healthLose: 1,
    environmentalDeaths: true,
    afterLastLife: 1, //nothing:0, spectator:1, ban:2
    dropSouls: true,
    requiredBeaconBaseSize: 4,
    randomRespawnHearts: false,
    maxRandomRespawnHearts: 15,
    minRandomRespawnHearts: 5,
    randomHearts: false,
    maxRandomHearts: 15,
    minRandomHearts: 5,
    respawnHearts: 10,
    lifestealEnchantment: true,
    healthStealChance: 10,
    healthStealAmountPerLevel: 1,
    lifestealDamageScaled: true,
    finalDeathAnimation: true,
    dropAllHearts: false,
    heartTransferChance: 100,
    campFireRegeneration: false,
    heartAppleChance: 0.3,
    recipes: {
        heart: {
            floorCrafting: false,
            ingredients: [
                "minecraft:obsidian",
                "minecraft:diamond_block",
                "minecraft:obsidian",
                "minecraft:diamond_block",
                "minecraft:air",
                "minecraft:diamond_block",
                "minecraft:obsidian",
                "minecraft:diamond_block",
                "minecraft:obsidian"
            ],
            result: "unitx:heart"
        },
        revive_beacon: {
            floorCrafting: false,
            ingredients: [
                "minecraft:netherite_block",
                "minecraft:nether_star",
                "minecraft:netherite_block",
                "minecraft:nether_star",
                "unitx:revive_soul",
                "minecraft:nether_star",
                "minecraft:netherite_block",
                "minecraft:nether_star",
                "minecraft:netherite_block"
            ],
            result: "unitx:revive_beacon"
        }
    }
}
export const beaconBaseBlocks = [
    "minecraft:gold_block",
    "minecraft:iron_block",
    "minecraft:diamond_block",
    "minecraft:emerald_block",
    "minecraft:netherite_block"
]
export const formData = {
    mainReviveMenu: {
        type: "actionFormData",
        title: "Reviving!",
        buttons: [
            { placement: 0, name: "Reviving", texture: "textures/blocks/deadbush", action: (player, admin) => openForm({ player: player, formKey: "revivingReviveMenu", admin: admin }) },
            { placement: 1, name: "Unbaning", texture: "textures/blocks/barrier", action: (player, admin) => openForm({ player: player, formKey: "unbanningReviveMenu", admin: admin }) }
        ]
    },
    unbanningReviveMenu: {
        type: "modalFormData",
        title: "Unbanning players",
        textField: [
            {
                placement: 0,
                name: "Players name:",
                id: "textField",
                action: ({ player, response, admin }) => {
                    let banned_players = Mc.world.getDynamicPropertyIds()
                    if (!banned_players.includes("banned:" + response)) player.sendMessage(`§cNo banned players with the name §7${response} §cfound!`)
                    else {
                        if (admin === undefined||admin===false) if (removeItems(player, "unitx:revive_soul", 1) === false) return
                        Mc.world.sendMessage(`§a${response} §7has been Unbanned`)
                        Mc.world.getAllPlayers().forEach(player => { player.playSound("ambient.weather.thunder") })
                    }
                }
            }
        ]
    },
    revivingReviveMenu: {
        type: "modalFormData",
        title: "Reviving",
        dropdown: [
            {
                placement: 0,
                name: "Player to revive",
                list: "onlinePlayers",
                id: "dropDown"
            }
        ],
        slider: [
            {
                placement: 1, admin: true, name: "Hearts", min: 1, max: 50, defaultValue: "respawnHearts", step: 1, id: "slider",
            }
        ],
        action: ({ player, response, admin }) => {
            let players = Mc.world.getAllPlayers()
            let foundPlayer = players.find(p => p.name === response[0]);
            if (foundPlayer === undefined) {
                player.sendMessage(`§cNo longer able to find ${response}!`)
                return
            }
            if (admin === undefined||admin===false) if (removeItems(player, "unitx:revive_soul", 1) === false) return
            respawn_player(foundPlayer, response[1], "ambient.weather.thunder")
            Mc.world.sendMessage(`§a${response[0]} has been revived!`)
        }
    },
    mainSettingsMenu: {
        type: "actionFormData",
        title: "Menu",
        buttons: [
            { placement: 0, name: "Settings", texture: "textures/items/book_writable", action: (player, admin) => openForm({ player: player, formKey: "mainSettingsMain", admin: admin }) },
            { placement: 1, name: "Reviving", texture: "textures/blocks/deadbush", action: (player, admin) => openForm({ player: player, formKey: "revivingReviveMenu", admin: admin }) },
            { placement: 2, name: "Unbaning", texture: "textures/blocks/barrier", action: (player, admin) => openForm({ player: player, formKey: "unbanningReviveMenu", admin: admin }) },
            { placement: 3, name: "Credits", texture: "textures/blocks/ender_chest_front", action: (player, admin) => openForm({ player: player, formKey: "mainSettingsCredits", admin: admin }) },
            { placement: 4, name: "Extras", texture: "textures/items/cake", action: (player, admin) => openForm({ player: player, formKey: "mainSettingsExtra", admin: admin }) },
            { placement: 5, name: "Custom recipes", texture: "textures/blocks/crafting_table_front", action: (player, admin) => openForm({ player: player, formKey: "mainRecipeMenu", admin: admin }) },
        ]
    },
    mainSettingsCredits: {
        type: "actionFormData",
        title: "Credits",
        body: "§7Made by §cUnitX\n\n§7Need help? §7Join my §9Discord\n§7https://discord.gg/krRXAdddgk\n\n§7Need a tutorial/info on settings? \n§cVist my youtube §7https://www.youtube.com/channel/UCUKB2Klf2Nkfi8reaxmdo0w",
        buttons: [
            { name: "§cClose", action: ({ }) => { return } },
        ]

    },
    mainSettingsExtra: {
        type: "modalFormData",
        title: "Extra settings",
        toggle: [
            {
                placement: 0, name: "Enable random starting hearts", defaultValue: "randomHearts", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("randomHearts", response)
                }
            },
            {
                placement: 3, name: "Lightning strike after final life", defaultValue: "finalDeathAnimation", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("finalDeathAnimation", response)
                }
            },
            {
                placement: 4, name: "Drop all hearts instead of receiving them", defaultValue: "dropAllHearts", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("dropAllHearts", response)
                }
            },
            {
                placement: 5, name: "Enable lifesteal enchantment", defaultValue: "lifestealEnchantment", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("lifestealEnchantment", response)
                    updateGameState({ state: "lifeStealEnchantment", value: undefined })
                }
            },
            {
                placement: 6, name: "Scale lifesteal enchantment by damage", defaultValue: "lifestealDamageScaled", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("lifestealDamageScaled", response)
                }
            },
            {
                placement: 10, name: "Campfire regneration", defaultValue: "campFireRegeneration", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("campFireRegeneration", response)
                }
            },
            {
                placement: 12, name: "Enable random respawn hearts", defaultValue: "randomRespawnHearts", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("randomRespawnHearts", response)
                }
            },
        ],
        slider: [
            {
                placement: 1, name: "Max starting hearts", min: 1, max: 50, defaultValue: "maxRandomHearts", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("maxRandomHearts", response)
                }
            },
            {
                placement: 2, name: "Min starting hearts", min: 1, max: 50, defaultValue: "minRandomHearts", step: 1, id: "slider",
                action: ({ player, response }) => {
                    let maxHealth = getAddonSetting("maxRandomHearts")
                    if (response > maxHealth) {
                        Mc.world.setDynamicProperty("minRandomHearts", maxHealth)
                        player.sendMessage(`§cMaximum hearts can't be lower than Minimum hearts`)
                    }
                    else Mc.world.setDynamicProperty("minRandomHearts", response)
                }
            },
            {
                placement: 9, name: "Chance of dropping/transferring hearts on death", min: 0, max: 100, defaultValue: "heartTransferChance", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("heartTransferChance", response)
                }
            },
            {
                placement: 7, name: "Lifesteal enchantment change", min: 1, max: 100, defaultValue: "healthStealChance", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("healthStealChance", response)
                }
            },
            {
                placement: 8, name: "Hearts per lifesteal level", min: 0.25, max: 10, defaultValue: "healthStealAmountPerLevel", step: 0.25, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("healthStealAmountPerLevel", response)
                }
            },
            {
                placement: 11, name: "Hearty apple drop chance", min: 0.1, max: 100, defaultValue: "heartAppleChance", step: 0.1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("heartAppleChance", response)
                }
            },
            {
                placement: 13, name: "Max respawn hearts", min: 1, max: 50, defaultValue: "maxRandomRespawnHearts", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("maxRandomRespawnHearts", response)
                }
            },
            {
                placement: 14, name: "Min respawn hearts", min: 1, max: 50, defaultValue: "minRandomRespawnHearts", step: 1, id: "slider",
                action: ({ player, response }) => {
                    let maxHealth = getAddonSetting("maxRandomRespawnHearts")
                    if (response > maxHealth) {
                        Mc.world.setDynamicProperty("minRandomRespawnHearts", maxHealth)
                        player.sendMessage(`§cMaximum hearts can't be lower than Minimum hearts`)
                    }
                    else Mc.world.setDynamicProperty("minRandomRespawnHearts", response)
                }
            },
        ],
    },
    mainSettingsMain: {
        type: "modalFormData",
        title: "Main settings",
        toggle: [
            {
                placement: 4, name: "You lose hearts anytime you die", defaultValue: "environmentalDeaths", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("environmentalDeaths", response)
                }
            },
            {
                placement: 5, name: "Bottled souls drop on last life", defaultValue: "dropSouls", id: "toggle",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("dropSouls", response)
                }
            },
            {
                placement: 9, name: "Health naturally regenerates", defaultValue: "naturalregeneration", id: "toggle",
                action: ({ response }) => {
                    Mc.world.gameRules.naturalRegeneration = response
                }
            }
        ],
        slider: [
            {
                placement: 0, name: "Starting hearts", min: 1, max: 50, defaultValue: "startingHealth", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("startingHealth", response)
                }
            },
            {
                placement: 1, name: "Max hearts", min: 1, max: 50, defaultValue: "maxHealth", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("maxHealth", response)
                    for (const player of Mc.world.getAllPlayers()) {
                        if (getPlayersMaxHealth(player) > response) player.triggerEvent("unitx:health" + response)
                    }
                }
            },
            {
                placement: 2, name: "Hearts gained when you kill", min: 0, max: 25, defaultValue: "healthGain", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("healthGain", response)
                }
            },
            {
                placement: 3, name: "Hearts lost when you die", min: 0, max: 25, defaultValue: "healthLose", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("healthLose", response)
                }
            },
            {
                placement: 6, name: "Required revive beacon base size", min: 0, max: 4, defaultValue: "requiredBeaconBaseSize", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("requiredBeaconBaseSize", response)
                }
            },
            {
                placement: 7, name: "Hearts given after being revived/unbanned", min: 1, max: 50, defaultValue: "respawnHearts", step: 1, id: "slider",
                action: ({ response }) => {
                    Mc.world.setDynamicProperty("respawnHearts", response)
                }
            }
        ],
        dropdown: [
            {
                placement: 8,
                name: "When you lose your last heart",
                list: ["nothing", "spectator", "ban"],
                defaultValue: "afterLastLife", id: "dropDown",
                action: ({ index }) => {
                    Mc.world.setDynamicProperty("afterLastLife", index)
                }
            }
        ]
    },
    withdrawHearts: {
        type: "modalFormData",
        title: "Menu",
        slider: [
            {
                placement: 0, name: "Amount", min: 1, max: "playersHealth", defaultValue: 1, step: 1, id: "slider",
                action: ({ player, response, admin }) => {
                    setPlayersHealth({ player: player, hearts: response, withdraw: true })
                    //const max = admin
                    // player.triggerEvent("unitx:health" + (Math.floor(max / 2) - response))
                    // player.runCommand(`give @s unitx:heart ${response}`)
                    // player.sendMessage(`§aYou have withdrawn §7${response} §ahearts`)
                }
            }
        ]
    },
    mainRecipeMenu: {
        type: "actionFormData",
        title: "Recipes",
        buttons: [
            { placement: 0, name: "Heart recipe", texture: "textures/items/heart", action: (player, admin) => openForm({ player: player, formKey: "heartRecipe", admin: admin }) },
            { placement: 1, name: "Revive beacon recipe", texture: "textures/items/unitx_beacon", action: (player, admin) => openForm({ player: player, formKey: "beaconRecipe", admin: admin }) }
        ]
    },
    heartRecipe: {
        type: "modalFormData",
        title: "Heart recipe",
        toggle: [
            {
                placement: 0, name: "Enable floor crafting for item", defaultValue: "recipes", id: "toggle", recipe: "heart",
            },
        ],
        textField: [
            {
                placement: 1,
                name: "Row 1 slot 1 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            },
            {
                placement: 2,
                name: "Row 1 slot 2 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            },
            {
                placement: 3,
                name: "Row 1 slot 3 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            },
            {
                placement: 4,
                name: "Row 2 slot 1 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            },
            {
                placement: 5,
                name: "Row 2 slot 2 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            },
            {
                placement: 6,
                name: "Row 2 slot 3 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            },
            {
                placement: 7,
                name: "Row 3 slot 1 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            },
            {
                placement: 8,
                name: "Row 3 slot 2 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            },
            {
                placement: 9,
                name: "Row 3 slot 3 item",
                defaultValue: "recipes",
                recipe: "heart",
                id: "textField"
            }
        ],
        action: ({ response }) => {
            const recipes = getAddonSetting("recipes")
            for (let i = 1; i < response.length; i++) {
                recipes["heart"].ingredients[i - 1] = response[i]
            }
            recipes["heart"].floorCrafting = response[0]
            Mc.world.setDynamicProperty("recipes", JSON.stringify(recipes))
            updateGameState({ state: "possibleCraftingItems", value: undefined })
        }
    },
    beaconRecipe: {
        type: "modalFormData",
        title: "Revive beacon recipe",
        toggle: [
            {
                placement: 0, name: "Enable floor crafting for item", defaultValue: "recipes", id: "toggle", recipe: "revive_beacon",
            },
        ],
        textField: [
            {
                placement: 1,
                name: "Row 1 slot 1 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            },
            {
                placement: 2,
                name: "Row 1 slot 2 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            },
            {
                placement: 3,
                name: "Row 1 slot 3 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            },
            {
                placement: 4,
                name: "Row 2 slot 1 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            },
            {
                placement: 5,
                name: "Row 2 slot 2 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            },
            {
                placement: 6,
                name: "Row 2 slot 3 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            },
            {
                placement: 7,
                name: "Row 3 slot 1 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            },
            {
                placement: 8,
                name: "Row 3 slot 2 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            },
            {
                placement: 9,
                name: "Row 3 slot 3 item",
                defaultValue: "recipes",
                recipe: "revive_beacon",
                id: "textField"
            }
        ],
        action: ({ response }) => {
            const recipes = getAddonSetting("recipes")
            for (let i = 1; i < response.length; i++) {
                recipes["revive_beacon"].ingredients[i - 1] = response[i]
            }
            recipes["revive_beacon"].floorCrafting = response[0]
            Mc.world.setDynamicProperty("recipes", JSON.stringify(recipes))
            updateGameState({ state: "possibleCraftingItems", value: undefined })
        }
    }
}