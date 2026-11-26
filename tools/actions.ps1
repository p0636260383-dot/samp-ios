param(
    [ValidateSet('Status', 'Logs', 'Download', 'Inspect', 'Dispatch')][string]$Action = 'Status',
    [long]$RunId = 0
)
$ErrorActionPreference = 'Stop'
$repo = 'papanan1412/samp-ios'
$root = Split-Path $PSScriptRoot -Parent
# Use the existing Git credential manager. Never print or persist credentials.
$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
if ($LASTEXITCODE -ne 0) { throw 'GitHub credentials are unavailable.' }
$passwordLine = $credentialLines | Where-Object { $_.StartsWith('password=') } | Select-Object -First 1
if (!$passwordLine) { throw 'GitHub credential manager did not return a token.' }
$headers = @{ Authorization = 'Bearer ' + $passwordLine.Substring(9); Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$credentialLines = $null
$passwordLine = $null
$base = 'https://api.github.com/repos/' + $repo
if ($Action -eq 'Inspect') {
    $repository = Invoke-RestMethod -Uri $base -Headers $headers
    $workflows = Invoke-RestMethod -Uri ($base + '/actions/workflows') -Headers $headers
    $repository | Select-Object full_name,private,default_branch,archived,permissions | ConvertTo-Json -Depth 3
    $workflows | ConvertTo-Json -Depth 4
    exit
}
if ($Action -eq 'Dispatch') {
    Invoke-RestMethod -Method Post -Uri ($base + '/actions/workflows/ios-build.yml/dispatches') -Headers $headers -ContentType 'application/json' -Body '{"ref":"main"}'
    Write-Output 'Requested iOS build on main.'
    exit
}
if (!$RunId) {
    $runs = Invoke-RestMethod -Uri ($base + '/actions/runs') -Headers $headers
    $RunId = $runs.workflow_runs[0].id
    if (!$RunId) { throw 'GitHub did not return any workflow runs. Inspect account-level Actions restrictions.' }
}
if ($Action -eq 'Status') {
    Write-Output ('Checking run ' + $RunId)
    $run = Invoke-RestMethod -Uri ($base + '/actions/runs/' + $RunId) -Headers $headers
    $jobs = Invoke-RestMethod -Uri ($base + '/actions/runs/' + $RunId + '/jobs') -Headers $headers
    [pscustomobject]@{ id=$run.id; status=$run.status; conclusion=$run.conclusion; head_sha=$run.head_sha; url=$run.html_url; jobs=@($jobs.jobs | Select-Object name,status,conclusion,steps) } | ConvertTo-Json -Depth 8
} elseif ($Action -eq 'Logs') {
    $directory = Join-Path $root ('build/action-logs-' + $RunId)
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $archive = Join-Path $directory 'logs.zip'
    Invoke-WebRequest -Uri ($base + '/actions/runs/' + $RunId + '/logs') -Headers $headers -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $directory -Force
    Get-ChildItem -LiteralPath $directory -Recurse -Filter '*.txt' | Select-String -Pattern 'error:|failed|BUILD SUCCEEDED|Executed [0-9]+ tests' | Select-Object -Last 45 | ForEach-Object { $_.Line }
} else {
    $artifacts = Invoke-RestMethod -Uri ($base + '/actions/runs/' + $RunId + '/artifacts') -Headers $headers
    $artifact = $artifacts.artifacts | Where-Object name -eq 'RotCity-iOS-unsigned' | Select-Object -First 1
    if (!$artifact) { throw 'The IPA artifact has not been produced.' }
    $directory = Join-Path $root ('build/artifact-' + $RunId)
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $archive = Join-Path $directory 'RotCity-iOS-unsigned.zip'
    Invoke-WebRequest -Uri $artifact.archive_download_url -Headers $headers -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $directory -Force
    Get-ChildItem -LiteralPath $directory | Select-Object Name,Length,FullName
}
