"""
ExamGuard Pro - Blockchain Routes
===================================
GET  /blockchain/chain         → Full chain dump
GET  /blockchain/verify        → Integrity verification
GET  /blockchain/stats         → Chain statistics
GET  /blockchain/session/{id}  → Events for a session
"""

from fastapi import APIRouter
from blockchain import blockchain
from models import BlockchainStatsResponse

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])


@router.get("/chain")
def get_full_chain():
    """Return the entire blockchain (for visualization)."""
    return {
        "chain": blockchain.get_chain(),
        "length": len(blockchain.get_chain()),
    }


@router.get("/verify")
def verify_chain():
    """Verify chain integrity - detects any tampering."""
    result = blockchain.verify_chain()
    return result


@router.get("/stats", response_model=BlockchainStatsResponse)
def get_stats():
    """Return blockchain statistics."""
    stats = blockchain.get_stats()
    verify = blockchain.verify_chain()
    return BlockchainStatsResponse(
        **stats,
        chain_valid=verify["valid"],
        verification_message=verify["message"],
    )


@router.get("/session/{session_id}")
def get_session_chain(session_id: str):
    """Get all blockchain events for a specific exam session."""
    events = blockchain.get_session_events(session_id)
    return {
        "session_id": session_id,
        "events": events,
        "count": len(events),
    }


@router.post("/tamper/{block_index}")
def tamper_blockchain(block_index: int):
    """Simulate tampering of a specific block in the blockchain."""
    success = blockchain.tamper_block(block_index)
    if not success:
        return {"status": "error", "message": f"Could not tamper block index {block_index}. Out of bounds?"}
    return {"status": "success", "message": f"Block index {block_index} successfully corrupted!"}
