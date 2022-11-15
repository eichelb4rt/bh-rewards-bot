from rewards import Rewards, REWARDS_FILE

def main():
    r = Rewards.from_file(REWARDS_FILE)
    print(f"These codes are available:\n{r}\nwhat code do you want?")
    reward_id = int(input("id: "))
    claimed = r.claim_by_id(reward_id)
    print(f"Your code: {claimed[0]}")

if __name__ == "__main__":
    main()