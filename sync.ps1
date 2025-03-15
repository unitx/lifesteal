# Define paths
$sourceBP = "$PSScriptRoot\lifesteal BP"
$sourceRP = "$PSScriptRoot\lifesteal RP"

$destBP = "$env:LOCALAPPDATA\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\development_behavior_packs\lifesteal"
$destRP = "$env:LOCALAPPDATA\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\development_resource_packs\lifesteal"

# Create destination folders if they don't exist
New-Item -ItemType Directory -Path $destBP -Force | Out-Null
New-Item -ItemType Directory -Path $destRP -Force | Out-Null
Write-Host "Syncing Addon between minecraft and vscode started..."
# Infinite loop to sync files every time a change is detected
while ($true) {
    #Write-Host "Syncing Behavior Pack..."
    Copy-Item -Path "$sourceBP\*" -Destination $destBP -Recurse -Force

    #Write-Host "Syncing Resource Pack..."
    Copy-Item -Path "$sourceRP\*" -Destination $destRP -Recurse -Force

    #Write-Host "Sync complete. Watching for changes..."
    Start-Sleep -Seconds 2
}
