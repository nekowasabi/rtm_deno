#!/usr/bin/env deno run --allow-run --allow-read --allow-write

import { ensureDir } from "https://deno.land/std@0.208.0/fs/ensure_dir.ts";

const VERSION = "1.0.0";

const TARGETS = [
  {
    name: "linux",
    target: "x86_64-unknown-linux-gnu",
    output: "rtm-linux",
    extension: "",
  },
  {
    name: "mac-intel",
    target: "x86_64-apple-darwin", 
    output: "rtm-mac-intel",
    extension: "",
  },
  {
    name: "mac-arm64",
    target: "aarch64-apple-darwin",
    output: "rtm-mac-arm64", 
    extension: "",
  },
  {
    name: "windows",
    target: "x86_64-pc-windows-msvc",
    output: "rtm-windows",
    extension: ".exe",
  },
] as const;

async function runCommand(cmd: string[]): Promise<void> {
  console.log(`Running: ${cmd.join(" ")}`);
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "inherit",
    stderr: "inherit",
  });
  
  const { code } = await process.output();
  if (code !== 0) {
    throw new Error(`Command failed with exit code ${code}: ${cmd.join(" ")}`);
  }
}

async function buildTarget(target: typeof TARGETS[number]): Promise<void> {
  const outputPath = `dist/${target.output}${target.extension}`;
  
  console.log(`\n🏗️  Building ${target.name} (${target.target})...`);
  
  const cmd = [
    "deno",
    "compile",
    "--allow-net",
    "--allow-env", 
    "--allow-read",
    "--allow-write",
    "--target",
    target.target,
    "--output",
    outputPath,
    "cli.ts",
  ];
  
  try {
    await runCommand(cmd);
    console.log(`✅ Built ${target.name}: ${outputPath}`);
    
    // Get file size
    const stat = await Deno.stat(outputPath);
    const sizeInMB = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`   Size: ${sizeInMB} MB`);
  } catch (error) {
    console.error(`❌ Failed to build ${target.name}:`, error.message);
    throw error;
  }
}

async function createChecksums(): Promise<void> {
  console.log("\n📝 Creating checksums...");
  
  const checksumFile = "dist/checksums.txt";
  const checksums: string[] = [];
  
  for (const target of TARGETS) {
    const filename = `${target.output}${target.extension}`;
    const filepath = `dist/${filename}`;
    
    try {
      const file = await Deno.readFile(filepath);
      const hashBuffer = await crypto.subtle.digest("SHA-256", file);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      checksums.push(`${hashHex}  ${filename}`);
      console.log(`   ${filename}: ${hashHex}`);
    } catch (error) {
      console.warn(`   Warning: Could not create checksum for ${filename}:`, error.message);
    }
  }
  
  await Deno.writeTextFile(checksumFile, checksums.join("\n") + "\n");
  console.log(`✅ Checksums saved to ${checksumFile}`);
}

async function main(): Promise<void> {
  console.log(`🚀 Building RTM CLI v${VERSION} for all platforms...\n`);
  
  // Ensure dist directory exists
  await ensureDir("dist");
  
  // Clean dist directory
  console.log("🧹 Cleaning dist directory...");
  try {
    for await (const entry of Deno.readDir("dist")) {
      if (entry.isFile) {
        await Deno.remove(`dist/${entry.name}`);
      }
    }
  } catch (error) {
    // Directory might be empty or not exist, that's fine
    console.log("   (directory was empty or didn't exist)");
  }
  
  // Build for all targets
  let successCount = 0;
  let failureCount = 0;
  
  for (const target of TARGETS) {
    try {
      await buildTarget(target);
      successCount++;
    } catch (error) {
      console.error(`Failed to build for ${target.name}:`, error);
      failureCount++;
    }
  }
  
  // Create checksums for successful builds
  if (successCount > 0) {
    await createChecksums();
  }
  
  // Summary
  console.log(`\n📊 Build Summary:`);
  console.log(`   ✅ Successful builds: ${successCount}`);
  console.log(`   ❌ Failed builds: ${failureCount}`);
  console.log(`   📁 Output directory: dist/`);
  
  if (failureCount > 0) {
    console.log(`\n⚠️  Some builds failed. Check the error messages above.`);
    Deno.exit(1);
  } else {
    console.log(`\n🎉 All builds completed successfully!`);
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error("❌ Build script failed:", error);
    Deno.exit(1);
  }
}