import os
import sys
import urllib.request
import zipfile
import shutil
import subprocess
import ctypes

def get_short_path_name(long_name):
    try:
        archive_size = 260
        buffer = ctypes.create_unicode_buffer(archive_size)
        get_short_path_name_w = ctypes.windll.kernel32.GetShortPathNameW
        result = get_short_path_name_w(long_name, buffer, archive_size)
        if result != 0:
            return buffer.value
    except Exception:
        pass
    return long_name

# Directories
BASE_DIR = get_short_path_name(os.path.dirname(os.path.abspath(__file__)))
TMP_DIR = os.path.join(BASE_DIR, "tmp_build_tools")
JDK_DIR = os.path.join(TMP_DIR, "jdk")
SDK_DIR = os.path.join(TMP_DIR, "sdk")
ANDROID_PROJ_DIR = os.path.join(BASE_DIR, "medscan-cardio-android")

os.makedirs(TMP_DIR, exist_ok=True)

def download_file(url, dest):
    print(f"Downloading {url}...")
    urllib.request.urlretrieve(url, dest)
    print("Download complete.")

def extract_zip(zip_path, dest_dir):
    print(f"Extracting {zip_path} to {dest_dir}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(dest_dir)
    print("Extraction complete.")

# 1. Download & Extract portable JDK 17
jdk_zip = os.path.join(TMP_DIR, "jdk.zip")
jdk_url = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.8.1%2B1/OpenJDK17U-jdk_x64_windows_hotspot_17.0.8.1_1.zip"
if not os.path.exists(JDK_DIR):
    download_file(jdk_url, jdk_zip)
    extract_zip(jdk_zip, TMP_DIR)
    # The zip contains a folder like jdk-17.0.8.1+1, rename it to 'jdk'
    extracted_folders = [f for f in os.listdir(TMP_DIR) if f.startswith("jdk-17")]
    if extracted_folders:
        os.rename(os.path.join(TMP_DIR, extracted_folders[0]), JDK_DIR)
    os.remove(jdk_zip)

# 2. Download & Extract Android Command Line Tools
sdk_zip = os.path.join(TMP_DIR, "sdk.zip")
sdk_url = "https://dl.google.com/android/repository/commandlinetools-win-10406996_latest.zip"
cmdline_tools_dest = os.path.join(SDK_DIR, "cmdline-tools")
if not os.path.exists(cmdline_tools_dest):
    download_file(sdk_url, sdk_zip)
    extract_zip(sdk_zip, cmdline_tools_dest)
    # Move content of 'cmdline-tools' to 'cmdline-tools/latest'
    inner_dir = os.path.join(cmdline_tools_dest, "cmdline-tools")
    latest_dir = os.path.join(cmdline_tools_dest, "latest")
    os.rename(inner_dir, latest_dir)
    os.remove(sdk_zip)

# 2.5. Download & Extract Gradle 8.2
gradle_zip = os.path.join(TMP_DIR, "gradle.zip")
gradle_url = "https://services.gradle.org/distributions/gradle-8.2-bin.zip"
gradle_dest = os.path.join(TMP_DIR, "gradle")
if not os.path.exists(gradle_dest):
    download_file(gradle_url, gradle_zip)
    extract_zip(gradle_zip, TMP_DIR)
    # The zip contains gradle-8.2 folder, rename to 'gradle'
    extracted_folders = [f for f in os.listdir(TMP_DIR) if f.startswith("gradle-8.2")]
    if extracted_folders:
        os.rename(os.path.join(TMP_DIR, extracted_folders[0]), gradle_dest)
    os.remove(gradle_zip)

# 3. Write Android Licenses
licenses_dir = os.path.join(SDK_DIR, "licenses")
os.makedirs(licenses_dir, exist_ok=True)
with open(os.path.join(licenses_dir, "android-sdk-license"), "w") as f:
    f.write("24333f8a63b6825ea9c5514f83c2829b004d1fee\n"
            "84831b9409646a918e30573bab4c9c91346d8abd\n"
            "6c17c24f6251c6997e9ca1464c207a6649cd2015\n"
            "f9839ecc17d587a80d85600a96405773b9079028\n"
            "e9ac30c81c02f2754b287ff0c48e89580b067f0a\n"
            "251603953e5f4d9b736b4122d26d56d78a2e5c9a\n"
            "2752d1c5d9cca92b53b66b7280ab749305608757\n")

# Environment setup
env = os.environ.copy()
env["JAVA_HOME"] = JDK_DIR
env["ANDROID_HOME"] = SDK_DIR
env["PATH"] = f"{os.path.join(JDK_DIR, 'bin')};{os.path.join(SDK_DIR, 'cmdline-tools', 'latest', 'bin')};{os.path.join(gradle_dest, 'bin')};{env.get('PATH', '')}"

# 4. Install Android platform 34 and build-tools 34.0.0
print("Installing Android SDK components...")
sdkmanager = os.path.join(SDK_DIR, "cmdline-tools", "latest", "bin", "sdkmanager.bat")
subprocess.run([sdkmanager, "--install", "platforms;android-34", "build-tools;34.0.0"], env=env, shell=True, check=True)

# 5. Build Gradle Project
print("Building APK using Gradle...")
gradle_bin = os.path.join(gradle_dest, "bin", "gradle.bat")
subprocess.run([gradle_bin, "assembleDebug"], cwd=ANDROID_PROJ_DIR, env=env, shell=True, check=True)

# 6. Copy generated APK to static folder
src_apk = os.path.join(ANDROID_PROJ_DIR, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
dest_apk = os.path.join(BASE_DIR, "static", "medscan-cardio.apk")

if os.path.exists(src_apk):
    shutil.copy(src_apk, dest_apk)
    print(f"SUCCESS! APK generated and copied to: {dest_apk}")
else:
    print("Error: APK file was not found after compilation.")
