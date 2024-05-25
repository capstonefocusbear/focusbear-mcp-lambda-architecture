# Function to fetch memory limit for cgroup v2
get_memory_limit_v2() {
    MEMORY_MAX=$(cat /sys/fs/cgroup/memory.max 2>/dev/null)
    echo $MEMORY_MAX
}

# Try to fetch memory limit using cgroup v2
MEMORY_LIMIT=$(get_memory_limit_v2)

# Check if we fetched a valid memory limit and it's not 'max'
if [ -n "$MEMORY_LIMIT" ] && [ "$MEMORY_LIMIT" != "max" ]; then
    # Convert the memory limit to megabytes
    MEMORY_LIMIT_MB=$((MEMORY_LIMIT / 1024 / 1024))

    # Calculate the memory limit for Node.js as 80% of the total available
    NODE_MEMORY_LIMIT=$((MEMORY_LIMIT_MB * 80 / 100))

    # Export the calculated memory limit
    export NODE_MAX_OLD_SPACE_SIZE=$NODE_MEMORY_LIMIT

    # Print the set limit (optional, for verification/logging)
    echo "Setting Node.js memory limit to $NODE_MAX_OLD_SPACE_SIZE MB"

    # Start the Node.js application with memory limit
    node --max-old-space-size=$NODE_MAX_OLD_SPACE_SIZE dist/apps/api-server/main
else
    # Memory limit information not available or 'max', start Node.js normally
    echo "Starting Node.js without memory limit settings"
    node dist/apps/api-server/main
fi
