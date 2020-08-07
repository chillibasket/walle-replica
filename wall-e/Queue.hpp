/* * * * * * * * * * * * * * * * * * * * * * *
 * GENERIC QUEUE CLASS
 * Ring Buffer, for use as FIFO or LIFO queue
 *
 * Code by:  Simon Bluett
 * Email:    hello@chillibasket.com
 * Version:  1.2
 * Date:     7th August 2020
 * Copyright (C) 2020, MIT License
 * * * * * * * * * * * * * * * * * * * * * * */

#ifndef QUEUE_HPP
#define QUEUE_HPP


/* Uncomment next line to allow size of queue to be dynamically increased */
//#define DYNAMIC_SIZE


// QUEUE CLASS DEFINITION
template<class T>
class Queue {

public:
	// Default Constructor
	Queue(int max = 50, T *buffer = NULL) {
		qFront = 0;
		qBack = 0;
		qSize = 0;
		maxSize = max;

		// Allocate data for the queue
		if (buffer == NULL) qData = new T[max];
		else qData = buffer;

		// If allocation has failed, set a warning flag
		if (qData == nullptr) warning = true;
		else warning = false;
	};

	// Default destructor
	~Queue() {
		delete[] qData;
	};

	// Manipulation Functions
	void push(const T &item);
	T pop();
	T pop_back();
	T front();
	T peek();
	T back();

	// Management Functions
	bool empty();
	inline int size();
	void clear();
	bool errors() { return warning; };

	

private:
	int qFront, qBack, qSize, maxSize;
	bool warning;
	T *qData;
};



/**
 * Get the size of the queue
 *
 * @return Current size of the queue
 */
template<class T> inline int Queue<T>::size() {
	return qSize;
}


/**
 * Add an item onto the back of the queue
 *
 * @param  Contents of the new item, passed by reference
 */
template<class T> void Queue<T>::push(const T &item) {
	// Check if there is space
	if(qSize < maxSize) {
		// Add item to the queue
		qData[qBack++] = item;
		qSize++;

		// Ensure circular buffer wraps around
		if (qBack >= maxSize) qBack -= maxSize;
	}

#ifdef DYNAMIC_SIZE
	// If queue can dynamically allocate more memory, increase size of queue
	else {
		// Create a queue which is twice the size
		T *newQueue = new T[maxSize*2];
		qSize = 0;

		// Fill the new queue with the data from the old one
		do {
			newQueue[qSize++] = qData[qFront++];
			if (qFront >= maxSize) qFront -= maxSize;
		} while (qFront != qBack);

		// Update integer variables
		qFront = 0;
		qBack = qSize;
		maxSize = maxSize*2;

		// Delete the old queue and transfer the new one into its place
		delete[] qData;
		qData = newQueue;

		// Add the new item
		push(item);
	}
#endif /* DYNAMIC_SIZE */
}


/**
 * Pop the oldest item off the from of the queue
 *
 * @return The item at the front of the queue
 */
template<class T> T Queue<T>::pop() {
	// If queue is empty, return an empty item
	if(qSize <= 0) return T();
	
	// Otherwise, retreive item from front of queue
	else {
		T result = qData[qFront];
		qFront++;
		qSize--;

		// Ensure circular buffer wraps around
		if (qFront >= maxSize) qFront -= maxSize;
		return result;
	} 
}


/**
 * Pop the newest item off the back of the queue
 *
 * @return The item at the back of the queue
 */
template<class T> T Queue<T>::pop_back() {
	// If queue is empty, return an empty item
	if(qSize <= 0) return T();
	
	// Otherwise, retreive item from back of queue
	else {
		int item = qBack - 1;
		if (item < 0) item += maxSize;

		T result = qData[item];
		qBack--;
		qSize--;

		// Ensure circular buffer wraps around
		if (qBack < 0) qBack += maxSize;
		return result;
	} 
}


/**
 * Read the item at the front, but leave it in place
 *
 * @return The item at the front of the queue
 */
template<class T> T Queue<T>::front() {
	if(qSize <= 0) return T();
	else return qData[qFront];
}

// "peek" is the same as "front"
template<class T> T Queue<T>::peek() {
	return front();
}


/**
 * Read the item at the back, but leave it in place
 *
 * @return The item at the back of the queue
 */
template<class T> T Queue<T>::back() {
	if(qSize <= 0) return T();
	else {
		int item = qBack - 1;
		if (item < 0) item += maxSize;
		return qData[item];
	}
}


/**
 * Check if the queue is empty
 * 
 * @return True if empty, false if there are still items
 */
template<class T> bool Queue<T>::empty() {
	if (qSize <= 0) return true;
	return false;
}


/**
 * Clear all items from the queue
 */
template<class T> void Queue<T>::clear() {
	qFront = qBack;
	qSize = 0;
}

#endif /* QUEUE_HPP */