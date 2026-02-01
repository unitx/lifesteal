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
    beaconEffects: true,
    withdrawCommand: true,
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
                placement: 0, name: {rawtext: [{translate: "lifesteal.setting_name.random_start_hearts"}]}, defaultValue: "randomHearts", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.random_start_hearts"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("randomHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 3, name: {rawtext: [{translate: "lifesteal.setting_name.final_death_animation"}]}, defaultValue: "finalDeathAnimation", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.final_death_animation"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("finalDeathAnimation", formDataResponse.inputData)
                }
            },
            {
                placement: 4, name: {rawtext: [{translate: "lifesteal.setting_name.drop_all_hearts"}]}, defaultValue: "dropAllHearts", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.drop_all_hearts"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("dropAllHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 5, name: {rawtext: [{translate: "lifesteal.setting_name.lifesteal_enchantment"}]}, defaultValue: "lifestealEnchantment", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.lifesteal_enchantment"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("lifestealEnchantment", formDataResponse.inputData)
                    updateGameState({ state: "lifeStealEnchantment", value: undefined })
                }
            },
            {
                placement: 6, name: {rawtext: [{translate: "lifesteal.setting_name.scaled_lifesteal_damage"}]}, defaultValue: "lifestealDamageScaled", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.scaled_lifesteal_damage"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("lifestealDamageScaled", formDataResponse.inputData)
                }
            },
            {
                placement: 10, name: {rawtext: [{translate: "lifesteal.setting_name.campfire_regeneration"}]}, defaultValue: "campFireRegeneration", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.campfire_regeneration"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("campFireRegeneration", formDataResponse.inputData)
                    updateGameState({ state: "campFireRegeneration", value: undefined })
                }
            },
            {
                placement: 12, name: {rawtext: [{translate: "lifesteal.setting_name.random_respawn_hearts"}]}, defaultValue: "randomRespawnHearts", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.random_respawn_hearts"}]},
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
                placement: 1, name: {rawtext: [{translate: "lifesteal.setting_name.max_random_starting_hearts"}]}, min: 1, max: 50, defaultValue: "maxRandomHearts", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.max_random_starting_hearts"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("maxRandomHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 2, name: {rawtext: [{translate: "lifesteal.setting_name.min_random_starting_hearts"}]}, min: 1, max: 50, defaultValue: "minRandomHearts", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.min_random_starting_hearts"}]},
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
                placement: 9, name: {rawtext: [{translate: "lifesteal.setting_name.heart_transfer_chance"}]}, min: 0, max: 100, defaultValue: "heartTransferChance", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.heart_transfer_chance"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("heartTransferChance", formDataResponse.inputData)
                }
            },
            {
                placement: 7, name: {rawtext: [{translate: "lifesteal.setting_name.enchantment_chance"}]}, min: 1, max: 100, defaultValue: "healthStealChance", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.enchantment_chance"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("healthStealChance", formDataResponse.inputData)
                }
            },
            {
                placement: 8, name: {rawtext: [{translate: "lifesteal.setting_name.lifesteal_enchantment_steal_amount"}]}, min: 0.25, max: 10, defaultValue: "healthStealAmountPerLevel", step: 0.25, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.lifesteal_enchantment_steal_amount"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("healthStealAmountPerLevel", formDataResponse.inputData)
                }
            },
            {
                placement: 11, name: {rawtext: [{translate: "lifesteal.setting_name.hearty_apple_drop_chance"}]}, min: 0, max: 100, defaultValue: "heartAppleChance", step: 0.1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.hearty_apple_drop_chance"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("heartAppleChance", formDataResponse.inputData)
                }
            },
            {
                placement: 13, name: {rawtext: [{translate: "lifesteal.setting_name.max_respawn_hearts"}]}, min: 1, max: 50, defaultValue: "maxRandomRespawnHearts", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.max_respawn_hearts"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("maxRandomRespawnHearts", formDataResponse.inputData)
                }
            },
            {
                placement: 14, name: {rawtext: [{translate: "lifesteal.setting_name.min_respawn_hearts"}]}, min: 1, max: 50, defaultValue: "minRandomRespawnHearts", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.min_respawn_hearts"}]},
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
                placement: 4, name: {rawtext: [{translate: "lifesteal.setting_name.environmental_deaths"}]}, defaultValue: "environmentalDeaths", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.environmental_deaths"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("environmentalDeaths", formDataResponse.inputData)
                }
            },
            {
                placement: 5, name: {rawtext: [{translate: "lifesteal.setting_name.drop_souls"}]}, defaultValue: "dropSouls", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.drop_souls"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("dropSouls", formDataResponse.inputData)
                }
            },
            {
                placement: 9, name: {rawtext: [{translate: "lifesteal.setting_name.natural_regeneration"}]}, defaultValue: "naturalregeneration", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.natural_regeneration"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.gameRules.naturalRegeneration = formDataResponse.inputData
                }
            },
            {
                placement: 10, name: {rawtext: [{translate: "lifesteal.setting_name.beacon_effects"}]}, defaultValue: "beaconEffects", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.beacon_effects"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("beaconEffects", formDataResponse.inputData)
                }
            },
            {
                placement: 11, name: {rawtext: [{translate: "lifesteal.setting_name.withdraw_command"}]}, defaultValue: "withdrawCommand", id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.withdraw_command"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("withdrawCommand", formDataResponse.inputData)
                }
            }
        ],
        slider: [
            {
                placement: 0, name: {rawtext: [{translate: "lifesteal.setting_name.starting_hearts"}]}, min: 1, max: 50, defaultValue: "startingHealth", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.starting_hearts"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("startingHealth", formDataResponse.inputData)
                }
            },
            {
                placement: 1, name: {rawtext: [{translate: "lifesteal.setting_name.max_hearts"}]}, min: 1, max: 50, defaultValue: "maxHealth", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.max_hearts"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("maxHealth", formDataResponse.inputData)
                    for (const player of Mc.world.getAllPlayers()) {
                        if (getPlayersMaxHealth(player)/2 > formDataResponse.inputData) setPlayersHealth({player:player,hearts:formDataResponse.inputData})
                    }
                }
            },
            {
                placement: 2, name: {rawtext: [{translate: "lifesteal.setting_name.kill_reword"}]}, min: 0, max: 25, defaultValue: "healthGain", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.kill_reword"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("healthGain", formDataResponse.inputData)
                }
            },
            {
                placement: 3, name: {rawtext: [{translate: "lifesteal.setting_name.death_penalty"}]}, min: 0, max: 25, defaultValue: "healthLose", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.death_penalty"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("healthLose", formDataResponse.inputData)
                }
            },
            {
                placement: 6, name: {rawtext: [{translate: "lifesteal.setting_name.beacon_size"}]}, min: 0, max: 4, defaultValue: "requiredBeaconBaseSize", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.beacon_size"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("requiredBeaconBaseSize", formDataResponse.inputData)
                }
            },
            {
                placement: 7, name: {rawtext: [{translate: "lifesteal.setting_name.respawn_hearts"}]}, min: 1, max: 50, defaultValue: "respawnHearts", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.respawn_hearts"}]},
                action: ({ formDataResponse }) => {
                    Mc.world.setDynamicProperty("respawnHearts", formDataResponse.inputData)
                }
            }
        ],
        dropdown: [
            {
                placement: 8,
                name: {rawtext: [{translate: "lifesteal.setting_name.death_mode"}]},
                list: ["nothing", "spectator", "ban"],
                defaultValue: "afterLastLife", id: "dropDown",
                tooltip: {rawtext: [{translate: "lifesteal.setting.death_mode"}]},
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
                placement: 0, name: "Amount", min: 1, max: "playersHealth", defaultValue: 1, step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.revive_hearts"}]},
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
                placement: 0, name: "Enable floor crafting for item", defaultValue: "recipes", id: "toggle", recipe: "heart", tooltip: {rawtext: [{translate: "lifesteal.setting.heart_recipe"}]},
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
                placement: 0, name: "Enable floor crafting for item", defaultValue: "recipes", id: "toggle", recipe: "revive_beacon", tooltip: {rawtext: [{translate: "lifesteal.setting.beacon_recipe"}]},
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
                placement: 2, admin: true, name: "Hearts", min: 1, max: 50, defaultValue: "respawnHearts", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.revive_hearts"}]},
            }
        ],
        toggle: [
            {
                placement: 1, admin: true, name: "Respawn player with custom hearts", defaultValue: false, id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.enable_revive_hearts"}]},
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
                placement: 2, admin: true, name: "Hearts", min: 1, max: 50, defaultValue: "respawnHearts", step: 1, id: "slider", tooltip: {rawtext: [{translate: "lifesteal.setting.revive_hearts"}]},
            }
        ],
        toggle: [
            {
                placement: 1, admin: true, name: "Respawn player with custom hearts", defaultValue: false, id: "toggle", tooltip: {rawtext: [{translate: "lifesteal.setting.enable_revive_hearts"}]},
            }
        ],
        textField: [
            {
                placement: 0, name: "Players name:", id: "textField", tooltip: {rawtext: [{translate: "lifesteal.setting.revive_username"}]},
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