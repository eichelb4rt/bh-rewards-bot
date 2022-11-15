from rewards import Rewards, REWARDS_FILE


def main():
    r = Rewards.from_file(REWARDS_FILE)
    print(r)


if __name__ == "__main__":
    main()
