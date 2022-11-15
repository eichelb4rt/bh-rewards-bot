from rewards import Rewards, REWARDS_FILE

def main():
    r = Rewards.from_file(REWARDS_FILE)
    print(f"These codes are available:\n{r}\nwhat codes do you want?")
    reward_id = int(input("id: "))
    count = int(input("count: "))
    claimed = r.claim_by_id(reward_id, count)
    claimed_str = '\n'.join(claimed)
    print(f"Your codes:\n{claimed_str}")

if __name__ == "__main__":
    main()