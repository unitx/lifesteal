import * as Mc from "@minecraft/server"
import { getAddonSetting, removeItems, openForm, getPlayersMaxHealth, updateGameState, setPlayersHealth } from "./main.js"

export const banId = "unitxLifestealBan:"
export const banTag = "unitxLifesteal:banned"
export const spectoratorId = "unitxLifestealSpectorator:"
export const spectoratorTag = "unitxLifesteal:spectorator"
export const changeHealthId = "unitxLifestealChangehealth:"

export const recivedStartingHealthTag = "unitxLifesteal:startingHealth"
export const processingCraftingItem = "unitxLifesteal:validCraftingItemProcessing"
export const validCraftingItem = "unitxLifesteal:validCraftingItem"
export const craftingItemTimerProperty = "unitxLifesteal:craftingItemTimer"
export const defaultAddonSetting = {
    startingHealth: 10,
    maxHealth: 20,
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
    beaconEffects: true,
    //developerOptions: false,
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
    mainSettingsMenu: {//button list
        type: "actionFormData",
        title: "Menu",
        buttons: [
            { placement: 0, name: "Main settings", texture: "textures/items/book_writable", action: (player, admin) => openForm({ player: player, formKey: "mainSettingsMain", admin: admin }) },
            { placement: 1, name: "Extras settings", texture: "textures/items/cake", action: (player, admin) => openForm({ player: player, formKey: "mainSettingsExtra", admin: admin }) },
            { placement: 2, name: "Custom recipes", texture: "textures/blocks/crafting_table_front", action: (player, admin) => openForm({ player: player, formKey: "mainRecipeMenu", admin: admin }) },
            { placement: 3, name: "Revive menu", texture: "textures/blocks/revive_beacon", action: (player, admin) => openForm({ player: player, formKey: "reviveTypeMenu", admin: admin }) },
            { placement: 4, name: "Credits", texture: "textures/blocks/ender_chest_front", action: (player, admin) => openForm({ player: player, formKey: "mainSettingsCredits", admin: admin }) },
        ]
    },
    mainSettingsCredits: {//text
        type: "actionFormData",
        title: "Credits",
        body: "§7Made by §cUnitX\n\n§7Need help? §7Join my §9Discord\n§7https://discord.gg/krRXAdddgk\n\n§7Need a more help with the pack? \n§cVist the wiki §7https://github.com/unitx/lifesteal/wiki",
        buttons: [
            { name: "§cClose", action: ({ }) => { return } },
        ]

    },
    mainSettingsExtra: {//data input
        type: "modalFormData",
        title: "Extra settings",
        toggle: [
            {
                placement: 0, name: "Enable random starting hearts", defaultValue: "randomHearts", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("randomHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 3, name: "Lightning strike after final life", defaultValue: "finalDeathAnimation", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("finalDeathAnimation", formDataResponse.inputData)
                }
            },
            {
                placement: 4, name: "Drop all hearts instead of receiving them", defaultValue: "dropAllHearts", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("dropAllHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 5, name: "Enable lifesteal enchantment", defaultValue: "lifestealEnchantment", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("lifestealEnchantment", formDataResponse.inputData)
                    updateGameState({ state: "lifeStealEnchantment", value: undefined })
                }
            },
            {
                placement: 6, name: "Scale lifesteal enchantment by damage", defaultValue: "lifestealDamageScaled", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("lifestealDamageScaled", formDataResponse.inputData)
                }
            },
            {
                placement: 10, name: "Campfire regneration", defaultValue: "campFireRegeneration", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("campFireRegeneration", formDataResponse.inputData)
                    updateGameState({ state: "campFireRegeneration", value: undefined })
                }
            },
            {
                placement: 12, name: "Enable random respawn hearts", defaultValue: "randomRespawnHearts", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("randomRespawnHearts", formDataResponse.inputData)
                }
            },
            // {
            //    placement: 15, name: "Enable developer options", defaultValue: "developerOptions", id: "toggle",
            //    action: ({ formDataResponse }) => {
            //         Mc.world.setDynamicProperty("developerOptionss", formDataResponse.inputData)
            //     }
            // },
        ],
        slider: [
            {
                placement: 1, name: "Max starting hearts", min: 1, max: 50, defaultValue: "maxRandomHearts", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("maxRandomHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 2, name: "Min starting hearts", min: 1, max: 50, defaultValue: "minRandomHearts", step: 1, id: "slider",
                action: ({ player, formDataResponse }) => {
                    let maxHealth = getAddonSetting("maxRandomHearts")
                    if (formDataResponse.inputData > maxHealth) {
                        Mc.world.setDynamicProperty("minRandomHearts", maxHealth)
                        player.sendMessage(`§cMaximum hearts can't be lower than Minimum hearts`)
                    }
                    else Mc.world.setDynamicProperty("minRandomHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 9, name: "Chance of dropping/transferring hearts on death", min: 0, max: 100, defaultValue: "heartTransferChance", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("heartTransferChance", formDataResponse.inputData)
                }
            },
            {
                placement: 7, name: "Lifesteal enchantment chance", min: 1, max: 100, defaultValue: "healthStealChance", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("healthStealChance", formDataResponse.inputData)
                }
            },
            {
                placement: 8, name: "§cNote, slider shows rounded down value, the correct value is still used§f\nHearts per lifesteal enchantment level", min: 0.25, max: 10, defaultValue: "healthStealAmountPerLevel", step: 0.25, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("healthStealAmountPerLevel", formDataResponse.inputData)
                }
            },
            {
                placement: 11, name: "§cNote, slider shows rounded down value, the correct value is still used§f\nHearty apple drop chance", min: 0, max: 100, defaultValue: "heartAppleChance", step: 0.1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("heartAppleChance", formDataResponse.inputData)
                }
            },
            {
                placement: 13, name: "Max respawn hearts", min: 1, max: 50, defaultValue: "maxRandomRespawnHearts", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("maxRandomRespawnHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 14, name: "Min respawn hearts", min: 1, max: 50, defaultValue: "minRandomRespawnHearts", step: 1, id: "slider",
                action: ({ player, formDataResponse }) => {
                    let maxHealth = getAddonSetting("maxRandomRespawnHearts")
                    if (formDataResponse.inputData > maxHealth) {
                        Mc.world.setDynamicProperty("minRandomRespawnHearts", maxHealth)
                        player.sendMessage(`§cMaximum hearts can't be lower than Minimum hearts`)
                    }
                    else Mc.world.setDynamicProperty("minRandomRespawnHearts", formDataResponse.inputData)
                }
            },
        ],
    },
    mainSettingsMain: {//data input
        type: "modalFormData",
        title: "Main settings",
        toggle: [
            {
                placement: 4, name: "You lose hearts anytime you die", defaultValue: "environmentalDeaths", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("environmentalDeaths", formDataResponse.inputData)
                }
            },
            {
                placement: 5, name: "Bottled souls drop on last life", defaultValue: "dropSouls", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("dropSouls", formDataResponse.inputData)
                }
            },
            {
                placement: 9, name: "Health naturally regenerates", defaultValue: "naturalregeneration", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.gameRules.naturalRegeneration = formDataResponse.inputData
                }
            },
            {
                placement: 10, name: "Enable beacon visual and sound effects", defaultValue: "beaconEffects", id: "toggle",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("beaconEffects", formDataResponse.inputData)
                }
            }
        ],
        slider: [
            {
                placement: 0, name: "Starting hearts", min: 1, max: 50, defaultValue: "startingHealth", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("startingHealth", formDataResponse.inputData)
                }
            },
            {
                placement: 1, name: "Max hearts", min: 1, max: 50, defaultValue: "maxHealth", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("maxHealth", formDataResponse.inputData)
                    for (const player of Mc.world.getAllPlayers()) {
                        if (getPlayersMaxHealth(player)/2 > formDataResponse.inputData) setPlayersHealth({player:player,hearts:formDataResponse.inputData})
                    }
                }
            },
            {
                placement: 2, name: "Hearts gained when you kill", min: 0, max: 25, defaultValue: "healthGain", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("healthGain", formDataResponse.inputData)
                }
            },
            {
                placement: 3, name: "Hearts lost when you die", min: 0, max: 25, defaultValue: "healthLose", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("healthLose", formDataResponse.inputData)
                }
            },
            {
                placement: 6, name: "Required revive beacon base size", min: 0, max: 4, defaultValue: "requiredBeaconBaseSize", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("requiredBeaconBaseSize", formDataResponse.inputData)
                }
            },
            {
                placement: 7, name: "Hearts given after being revived/unbanned", min: 1, max: 50, defaultValue: "respawnHearts", step: 1, id: "slider",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("respawnHearts", formDataResponse.inputData)
                }
            }
        ],
        dropdown: [
            {
                placement: 8,
                name: "When you lose your last heart",
                list: ["nothing", "spectator", "ban"],
                defaultValue: "afterLastLife", id: "dropDown",
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("afterLastLife", formDataResponse.inputData)
                }
            }
        ]
    },
    withdrawHearts: {//data input
        type: "modalFormData",
        title: "Menu",
        slider: [
            {
                placement: 0, name: "Amount", min: 1, max: "playersHealth", defaultValue: 1, step: 1, id: "slider",
                action: ({ player, formDataResponse }) => {
                    setPlayersHealth({ player: player, hearts: formDataResponse.inputData, withdraw: true })
                }
            }
        ]
    },
    mainRecipeMenu: {//button list
        type: "actionFormData",
        title: "Recipes",
        buttons: [
            { placement: 0, name: "Heart recipe", texture: "textures/items/heart", action: (player, admin) => openForm({ player: player, formKey: "heartRecipe", admin: admin }) },
            { placement: 1, name: "Revive beacon recipe", texture: "textures/blocks/revive_beacon", action: (player, admin) => openForm({ player: player, formKey: "beaconRecipe", admin: admin }) }
        ]
    },
    heartRecipe: {//data input
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
        action: ({ formDataResponse }) => {
            const recipes = getAddonSetting("recipes")
            for (let i = 1; i < formDataResponse.length; i++) {
                recipes["heart"].ingredients[i - 1] = formDataResponse[i].inputData
            }
            recipes["heart"].floorCrafting = formDataResponse[0].inputData
            Mc.world.setDynamicProperty("recipes", JSON.stringify(recipes))
            updateGameState({ state: "possibleCraftingItems", value: undefined })
        }
    },
    beaconRecipe: {//data input
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
        action: ({ formDataResponse }) => {
            const recipes = getAddonSetting("recipes")
            for (let i = 1; i < formDataResponse.length; i++) {
                recipes["revive_beacon"].ingredients[i - 1] = formDataResponse[i].inputData
            }
            recipes["revive_beacon"].floorCrafting = formDataResponse[0].inputData
            Mc.world.setDynamicProperty("recipes", JSON.stringify(recipes))
            updateGameState({ state: "possibleCraftingItems", value: undefined })
        }
    },
    reviveDropdownMenu: {//data input
        type: "modalFormData",
        title: "Reviving",
        dropdown: [
            {
                placement: 0,
                name: "Player to revive",
                list: "fallenPlayers",
                id: "dropDown"
            }
        ],
        slider: [
            {
                placement: 2, admin: true, name: "Hearts", min: 1, max: 50, defaultValue: "respawnHearts", step: 1, id: "slider",
            }
        ],
        toggle: [
            {
                placement: 1, admin: true, name: "Respawn player with custom hearts", defaultValue: false, id: "toggle",
            }
        ],
        action: ({ player, admin, formDataResponse, location }) => {
            const propId = formDataResponse[0].inputDropDownData[formDataResponse[0].inputData]
            if (admin === undefined || admin === false) if (removeItems(player, "unitx:revive_soul", 1) === false) return
            Mc.world.setDynamicProperty(propId, undefined)
            const name = propId.split(":", 2)[1]
            if (admin !== undefined && admin !== false) {
                if (formDataResponse[1].inputData === true) {
                    Mc.world.setDynamicProperty(changeHealthId + name, formDataResponse[2].inputData)
                }
            }
            Mc.world.sendMessage(`§a${name} §7has been brought back to life`)
            if(location!==undefined) player.dimension.playSound("beacon.power", location)
            Mc.world.getAllPlayers().forEach(player => { player.playSound("ambient.weather.thunder") })
        }
    },
    reviveInputMenu: {//data input
        type: "modalFormData",
        title: "Reviving",
        slider: [
            {
                placement: 2, admin: true, name: "Hearts", min: 1, max: 50, defaultValue: "respawnHearts", step: 1, id: "slider",
            }
        ],
        toggle: [
            {
                placement: 1, admin: true, name: "Respawn player with custom hearts", defaultValue: false, id: "toggle",
            }
        ],
        textField: [
            {
                placement: 0,
                name: "Players name:",
                id: "textField",
            }
        ],
        action: ({ player, admin, formDataResponse, location }) => {
            const banned_players = Mc.world.getDynamicPropertyIds()
            const name = formDataResponse[0].inputData
            if (!banned_players.includes(banId + name) && !banned_players.includes(spectoratorId + name)) {
                player.sendMessage(`§7No players with the name §c${name} §7can be found to be brought back to life!`)
                return
            }
            if (admin === undefined || admin === false) if (removeItems(player, "unitx:revive_soul", 1) === false) return
            Mc.world.setDynamicProperty(banId + name, undefined)
            Mc.world.setDynamicProperty(spectoratorId + name, undefined)
            if (admin !== undefined && admin !== false) {
                if (formDataResponse[1].inputData === true) {
                    Mc.world.setDynamicProperty(changeHealthId + name, formDataResponse[2].inputData)
                }
            }
            Mc.world.sendMessage(`§a${name} §7has been brought back to life`)
            if(location!==undefined) player.dimension.playSound("beacon.power", location)
            Mc.world.getAllPlayers().forEach(player => { player.playSound("ambient.weather.thunder") })
        }
    },
    reviveTypeMenu: {//button list
        type: "actionFormData",
        title: "Input type",
        buttons: [
            { placement: 0, name: "Manual entry", texture: "textures/items/name_tag", action: (player, admin, location) => openForm({ player: player, formKey: "reviveInputMenu", admin: admin, location: location }) },
            { placement: 1, name: "List", texture: "textures/items/flower_banner_pattern", action: (player, admin, location) => openForm({ player: player, formKey: "reviveDropdownMenu", admin: admin, location: location }) },
        ]
    }
}
