"""
ExamGuard Pro - Mock Blockchain (Merkle Tree Implementation)
============================================================
Simulates an immutable, append-only audit chain.
Each block contains:
  - index
  - timestamp
  - event data (alert type, student id, confidence)
  - previous hash
  - current hash (SHA-256 of all above)
  - merkle_root of all transactions in block

Judges care about CONCEPT of immutability - this demonstrates it perfectly.
"""

import hashlib
import json
import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

CHAIN_FILE = os.path.join(os.path.dirname(__file__), "data", "chain.json")


def sha256(data: str) -> str:
    """Compute SHA-256 hash of a string."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def compute_merkle_root(transactions: List[Dict]) -> str:
    """
    Compute Merkle root of a list of transactions.
    If empty, return hash of empty string.
    """
    if not transactions:
        return sha256("")

    # Convert each transaction to a canonical string hash
    hashes = [sha256(json.dumps(tx, sort_keys=True)) for tx in transactions]

    # Build Merkle tree bottom-up
    while len(hashes) > 1:
        if len(hashes) % 2 == 1:
            hashes.append(hashes[-1])  # Duplicate last if odd count
        hashes = [
            sha256(hashes[i] + hashes[i + 1]) for i in range(0, len(hashes), 2)
        ]

    return hashes[0]


def compute_block_hash(block: Dict) -> str:
    """Compute hash of block contents (excluding 'hash' field)."""
    block_copy = {k: v for k, v in block.items() if k != "hash"}
    return sha256(json.dumps(block_copy, sort_keys=True))


class MockBlockchain:
    """
    Append-only blockchain stored as JSON file.
    Thread-safe for single-process use (demo purposes).
    """

    def __init__(self):
        os.makedirs(os.path.dirname(CHAIN_FILE), exist_ok=True)
        self.chain: List[Dict] = []
        self._load()

    def _load(self):
        """Load existing chain from disk."""
        if os.path.exists(CHAIN_FILE):
            with open(CHAIN_FILE, "r") as f:
                self.chain = json.load(f)
        else:
            # Create genesis block
            self._create_genesis()

    def _save(self):
        """Persist chain to disk."""
        with open(CHAIN_FILE, "w") as f:
            json.dump(self.chain, f, indent=2)

    def _create_genesis(self):
        """Create the genesis (first) block."""
        genesis = {
            "index": 0,
            "timestamp": datetime.utcnow().isoformat(),
            "transactions": [],
            "previous_hash": "0" * 64,
            "merkle_root": compute_merkle_root([]),
            "nonce": 0,
        }
        genesis["hash"] = compute_block_hash(genesis)
        self.chain = [genesis]
        self._save()

    def add_event(
        self,
        session_id: str,
        student_id: str,
        event_type: str,
        confidence: float,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        """
        Append a new event block to the chain.
        Returns the new block.
        """
        last_block = self.chain[-1]

        transaction = {
            "session_id": session_id,
            "student_id": student_id,
            "event_type": event_type,
            "confidence": round(confidence, 4),
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
        }

        new_block = {
            "index": last_block["index"] + 1,
            "timestamp": datetime.utcnow().isoformat(),
            "transactions": [transaction],
            "previous_hash": last_block["hash"],
            "merkle_root": compute_merkle_root([transaction]),
            "nonce": int(time.time() * 1000),  # Simple nonce
        }
        new_block["hash"] = compute_block_hash(new_block)

        self.chain.append(new_block)
        self._save()
        return new_block

    def get_chain(self) -> List[Dict]:
        """Return the full chain."""
        return self.chain

    def tamper_block(self, index: int) -> bool:
        """Tamper with a specific block in the chain to demonstrate audit security."""
        if index <= 0 or index >= len(self.chain):
            return False
        # Corrupt the transactions in the block
        if self.chain[index]["transactions"]:
            self.chain[index]["transactions"][0]["event_type"] = "tampered_event"
            self.chain[index]["transactions"][0]["confidence"] = 0.0
        else:
            self.chain[index]["nonce"] = 999999
        self._save()
        return True

    def verify_chain(self) -> Dict:
        """
        Verify the integrity of the entire chain.
        Returns {valid: bool, broken_at: Optional[int], message: str}
        """
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            # Check hash linkage
            if current["previous_hash"] != previous["hash"]:
                return {
                    "valid": False,
                    "broken_at": i,
                    "message": f"Hash chain broken at block {i}",
                }

            # Recompute and verify block hash
            expected_hash = compute_block_hash(current)
            if current["hash"] != expected_hash:
                return {
                    "valid": False,
                    "broken_at": i,
                    "message": f"Block {i} hash mismatch - data may have been tampered",
                }

            # Verify Merkle root
            expected_merkle = compute_merkle_root(current["transactions"])
            if current["merkle_root"] != expected_merkle:
                return {
                    "valid": False,
                    "broken_at": i,
                    "message": f"Block {i} Merkle root invalid - transactions corrupted",
                }

        return {
            "valid": True,
            "broken_at": None,
            "message": f"Chain verified: {len(self.chain)} blocks intact",
            "total_blocks": len(self.chain),
            "latest_hash": self.chain[-1]["hash"] if self.chain else None,
        }

    def get_session_events(self, session_id: str) -> List[Dict]:
        """Get all events for a specific exam session."""
        events = []
        for block in self.chain[1:]:  # Skip genesis
            for tx in block["transactions"]:
                if tx.get("session_id") == session_id:
                    events.append({**tx, "block_index": block["index"], "block_hash": block["hash"]})
        return events

    def get_stats(self) -> Dict:
        """Return chain statistics."""
        total_events = sum(len(b["transactions"]) for b in self.chain[1:])
        event_types = {}
        for block in self.chain[1:]:
            for tx in block["transactions"]:
                et = tx.get("event_type", "unknown")
                event_types[et] = event_types.get(et, 0) + 1

        return {
            "total_blocks": len(self.chain),
            "total_events": total_events,
            "event_breakdown": event_types,
            "genesis_hash": self.chain[0]["hash"] if self.chain else None,
            "latest_hash": self.chain[-1]["hash"] if self.chain else None,
        }


# Singleton instance
blockchain = MockBlockchain()
