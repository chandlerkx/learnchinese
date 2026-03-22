param (
    [switch]$SkipBuild
)

$extensionDir = "extension"
$manifestPath = "$extensionDir\manifest.json"
$oldDir = "old"
$projectName = "learnchinese"

# 1. Optionally run the build script first
if (-not $SkipBuild -and (Test-Path "build.sh")) {
    Write-Host "Running build.sh first..."
    bash build.sh
}

# 2. Read and parse the manifest.json
Write-Host "Reading manifest.json..."
$manifestContent = Get-Content $manifestPath -Raw | ConvertFrom-Json

# 3. Increment the version number
$currentVersion = $manifestContent.version
$versionParts = $currentVersion -split '\.'
if ($versionParts.Length -ge 3) {
    # Increment the patch version
    $versionParts[2] = [int]$versionParts[2] + 1
} else {
    # Fallback if the format isn't x.y.z
    $versionParts[-1] = [int]$versionParts[-1] + 1
}

$newVersion = $versionParts -join '.'
$manifestContent.version = $newVersion

# 4. Save the updated manifest.json
Write-Host "Updating version from $currentVersion to $newVersion in manifest.json..."
$manifestContent | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
Write-Host "manifest.json updated successfully."

# 5. Create the 'old' directory if it doesn't exist
if (-not (Test-Path $oldDir)) {
    Write-Host "Creating 'old' directory for previous versions..."
    New-Item -ItemType Directory -Path $oldDir | Out-Null
}

# 6. Move existing zip files to the 'old' folder
$existingZips = Get-ChildItem -Path . -Filter "$projectName*.zip"
foreach ($zip in $existingZips) {
    Write-Host "Moving previous version $($zip.Name) to 'old' folder..."
    Move-Item -Path $zip.FullName -Destination $oldDir -Force
}

# 7. Zip the extension folder
$zipFileName = "${projectName}_v${newVersion}.zip"
Write-Host "Creating new zip file: $zipFileName"
Compress-Archive -Path "$extensionDir\*" -DestinationPath $zipFileName -Force

Write-Host "Created release: $zipFileName"
Write-Host "Done!"
