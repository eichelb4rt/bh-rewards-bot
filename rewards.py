import json
from typing import Self
from tabulate import tabulate
from collections import Counter
from dataclasses import dataclass, fields

REWARDS_FILE = "rewards.json"


@dataclass
class Reward:
    code: str
    name: str
    claimed: bool

    def to_dict(self):
        return {f.name: getattr(self, f.name) for f in fields(self)}

    def __hash__(self):
        return hash(fields(self))

    @classmethod
    def from_json(cls, reward_json) -> Self:
        keys = [f.name for f in fields(cls)]
        normal_json_data = {key: reward_json[key] for key in keys}
        return cls(**normal_json_data)


def pretty(reward_name: str) -> str:
    return reward_name.lower()[:-2]


def load_rewards(file_name) -> list[Reward]:
    with open(file_name, 'r') as f:
        rewards_json = json.load(f)
        return [Reward.from_json(reward) for reward in rewards_json]


def count_rewards(rewards: list[Reward]) -> dict[str, int]:
    c = Counter()
    for reward in rewards:
        if not reward.claimed:
            c[reward.name] += 1
    return c


def to_dict(rewards: list[Reward]) -> dict[str, list[str]]:
    d: dict[str, list[str]] = {}
    for reward in rewards:
        if reward.claimed:
            continue
        if reward.name not in d:
            d[reward.name] = []
        d[reward.name].append(reward.code)
    return d


class Rewards:
    def __init__(self, rewards: list[Reward], rewards_file=REWARDS_FILE):
        self.list = rewards
        self.rewards_file = rewards_file
        self.dict = to_dict(rewards)
        self.counted = count_rewards(rewards)
        self.codes = [reward.code for reward in self.list]
        self.reward_names: list[str] = list(self.counted.keys())
        self.id_to_name: dict[int, str] = {i: name for i, name in enumerate(self.reward_names)}

    def claim(self, code: str):
        """Only claims a code in array, does not write."""

        assert code in self.codes, f"Code {code} not found in codes."
        i = self.codes.index(code)
        self.list[i].claimed = True

    def claim_by_id(self, id: int, count: int = 1) -> list[str]:
        """Claims count codes of id, and writes back to file."""

        name = self.id_to_name[id]
        codes = self.dict[name]
        assert count <= len(codes), f"I don't have {count} codes for {pretty(name)}."
        claimed = codes[:count]
        for code in claimed:
            self.claim(code)
        self.write()
        return claimed

    def json(self):
        return [reward.to_dict() for reward in self.list]

    def write(self, file_name=None):
        if file_name is None:
            file_name = self.rewards_file
        with open(file_name, 'w') as f:
            json.dump(self.json(), f, indent=2)

    def __getitem__(self, item: str | int) -> Reward:
        if type(item) == int:
            return self.list[item]
        return self.dict[item]

    def __repr__(self) -> str:
        return tabulate([(i, pretty(name), self.counted[name]) for i, name in enumerate(self.reward_names)],
                        headers=["id", "reward name", "number of codes left"],
                        tablefmt='simple_grid')

    @classmethod
    def from_file(cls, file_name) -> Self:
        return Rewards(load_rewards(file_name), rewards_file=file_name)


def main():
    rewards = Rewards.from_file(REWARDS_FILE)
    print(rewards)
    rewards.write()


if __name__ == "__main__":
    main()
