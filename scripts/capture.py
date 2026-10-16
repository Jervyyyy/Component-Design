#!/usr/bin/env python3
"""Capture Trip App component screenshots in the four foldable modes via adb.

Run on the machine where DeviceHub exposes the device over adb (`adb devices` lists it).
For each component and mode it waits for Enter, grabs the screen and records the file
in shots/plan.csv for `lark_table.py upload`.

  python3 scripts/capture.py -s <serial> --components components.txt
  python3 scripts/capture.py -s <serial> --components components.txt --device-state 01=0,02=3,03=3,04=2

--device-state maps each mode to an Android `cmd device_state state <id>` value so the
fold posture is switched automatically (`adb shell cmd device_state print-states` lists
ids). Without it you switch posture on the device / in DeviceHub yourself; 02 and 03
differ only in rotation, so the script rotates via settings when the mode needs it.
"""
import argparse
import csv
import os
import re
import subprocess
import sys

MODES = {
    "01": ("外屏竖", 0),
    "02": ("内屏展开横", 1),
    "03": ("内屏展开竖", 0),
    "04": ("半折Book", None),
}


def adb(serial, *args, capture=False):
    cmd = ["adb"] + (["-s", serial] if serial else []) + list(args)
    if capture:
        return subprocess.run(cmd, check=True, stdout=subprocess.PIPE).stdout
    subprocess.run(cmd, check=True)


def set_rotation(serial, rotation):
    adb(serial, "shell", "settings", "put", "system", "accelerometer_rotation", "0")
    adb(serial, "shell", "settings", "put", "system", "user_rotation", str(rotation))


def slug(name):
    return re.sub(r"[^\w一-鿿-]+", "_", name).strip("_")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("-s", "--serial", help="adb device serial")
    p.add_argument("--components", required=True,
                   help="text file, one component name per line, exactly as in the table's first column")
    p.add_argument("--modes", default="01,02,03,04")
    p.add_argument("--device-state", help="e.g. 01=0,02=3,03=3,04=2")
    p.add_argument("--out", default="shots")
    args = p.parse_args()

    with open(args.components, encoding="utf-8") as f:
        components = [l.strip() for l in f if l.strip() and not l.startswith("#")]
    modes = [m.strip().zfill(2) for m in args.modes.split(",")]
    states = dict(kv.split("=") for kv in args.device_state.split(",")) if args.device_state else {}

    os.makedirs(args.out, exist_ok=True)
    plan_path = os.path.join(args.out, "plan.csv")
    new_plan = not os.path.exists(plan_path)
    with open(plan_path, "a", newline="", encoding="utf-8") as pf:
        writer = csv.writer(pf)
        if new_plan:
            writer.writerow(["component", "mode", "file"])
        # mode-major order: switch posture once, then walk through every component
        for mode in modes:
            label, rotation = MODES[mode]
            if mode in states:
                adb(args.serial, "shell", "cmd", "device_state", "state", states[mode])
            if rotation is not None:
                set_rotation(args.serial, rotation)
            print(f"\n=== {mode} {label} ===")
            if mode not in states:
                input(f"Put the device in {label}, then press Enter...")
            for comp in components:
                ans = input(f"[{mode} {label}] open「{comp}」in Trip App, Enter to shoot (s=skip): ")
                if ans.strip().lower() == "s":
                    continue
                rel = os.path.join(slug(comp), f"{mode}.png")
                dest = os.path.join(args.out, rel)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as f:
                    f.write(adb(args.serial, "exec-out", "screencap", "-p", capture=True))
                writer.writerow([comp, mode, rel])
                pf.flush()
                print(f"  saved {dest}")
    if states:
        adb(args.serial, "shell", "cmd", "device_state", "state", "reset")
    print(f"\nplan written to {plan_path}")


if __name__ == "__main__":
    sys.exit(main())
