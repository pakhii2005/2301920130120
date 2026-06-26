/**
 * Priority Sorting Engine - Stage 6 Implementation
 * Evaluates real-time external stream notifications across custom category weight matrices and chronological recency.
 */

// Custom Internal Logging Utility to comply with strict non-standard logging rules
const autonomousLogger = {
    logOutput: (eventIdentity, contextMetadata) => {
        const structuralLog = {
            timestamp: new Date().toISOString(),
            event: eventIdentity,
            ...contextMetadata
        };
        process.stdout.write(JSON.stringify(structuralLog) + '\n');
    },
    logException: (errorIdentity, faultMetadata) => {
        const structuralError = {
            timestamp: new Date().toISOString(),
            error: errorIdentity,
            ...faultMetadata
        };
        process.stderr.write(JSON.stringify(structuralError) + '\n');
    }
};

// Priority allocation weight guidelines (Placement > Result > Event)
const CLASSIFICATION_WEIGHTS = {
    'Placement': 3,
    'Result': 2,
    'Event': 1
};

/**
 * Connects to the external evaluation stream service, ranks records, and extracts top entries
 * @param {number} totalSize - Number of top unread items to retain dynamically (e.g., 10)
 * @returns {Promise<Array>} The isolated priority items
 */
async function assemblePriorityInbox(totalSize = 10) {
    const EVALUATION_STREAM_URL = 'http://4.224.186.213/evaluation_service/notifications';
    
    try {
        const response = await fetch(EVALUATION_STREAM_URL);
        
        if (!response.ok) {
            throw new Error(`Target stream evaluation failed with HTTP Status: ${response.status}`);
        }

        const dataPayload = await response.json();
        const notificationFeed = dataPayload.notifications || [];

        notificationFeed.sort((itemA, itemB) => {
            const priorityA = CLASSIFICATION_WEIGHTS[itemA.Type] || 0;
            const priorityB = CLASSIFICATION_WEIGHTS[itemB.Type] || 0;

            if (priorityB !== priorityA) {
                return priorityB - priorityA; 
            }

            return new Date(itemB.Timestamp) - new Date(itemA.Timestamp);
        });

        const tailoredPriorityInbox = notificationFeed.slice(0, totalSize);

        autonomousLogger.logOutput('PRIORITY_ENGINE_SUCCESS', {
            processedCount: notificationFeed.length,
            returnedCount: tailoredPriorityInbox.length,
            limitParameter: totalSize
        });

        return tailoredPriorityInbox;

    } catch (error) {
        autonomousLogger.logException('PRIORITY_ENGINE_FAILURE', { 
            message: error.message 
        });
        return [];
    }
}

module.exports = { assemblePriorityInbox };
