import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem.js';

class CustomObjectLoader extends THREE.ObjectLoader {
    parseObject(data, parent) {
        if (data.type === 'ParticleSystem') {
            console.log('Parsing ParticleSystem:', data);

            // Create the ParticleSystem object
            const particleSystem = ParticleSystem.fromJSON(data);

            // Handle standard Object3D properties
            if (data.uuid) particleSystem.uuid = data.uuid;
            if (data.name) particleSystem.name = data.name;
            if (data.position) particleSystem.position.fromArray(data.position);
            if (data.rotation) particleSystem.rotation.fromArray(data.rotation);
            if (data.scale) particleSystem.scale.fromArray(data.scale);
            if (data.matrix) particleSystem.matrix.fromArray(data.matrix);
            if (data.visible !== undefined) particleSystem.visible = data.visible;
            if (data.userData) particleSystem.userData = data.userData;

            // Handle children if they exist
            if (data.children) {
                for (let i = 0; i < data.children.length; i++) {
                    const child = this.parseObject(data.children[i], particleSystem);
                    if (child) particleSystem.add(child);
                }
            }

            return particleSystem;
        }

        // For all other object types, use the default parser
        return super.parseObject(data, parent);
    }

    // Override parseAsync to handle the full JSON structure properly
    async parseAsync(json, onLoad, onProgress, onError) {
        // Store custom objects separately
        this.customObjects = [];

        try {
            // First pass: collect and remove ParticleSystem objects
            this.preprocessJSON(json);

            // Parse normally with Three.js
            const result = await super.parseAsync(json, onLoad, onProgress, onError);

            // Second pass: add custom objects back
            this.addCustomObjects(result);

            return result;
        } catch (error) {
            if (onError) onError(error);
            throw error;
        }
    }

    preprocessJSON(data) {
        if (!data || typeof data !== 'object') return;

        if (data.type === 'ParticleSystem') {
            // Store custom object info
            this.customObjects.push({
                data: { ...data },
                parent: null // Will be resolved later
            });

            // Replace with empty Group to maintain hierarchy
            data.type = 'Group';
            delete data.geometry;
            delete data.material;
            delete data.config;
        }

        // Recursively process children
        if (Array.isArray(data.children)) {
            data.children.forEach(child => this.preprocessJSON(child));
        }

        // Process object if it has an object property (scene format)
        if (data.object) {
            this.preprocessJSON(data.object);
        }
    }

    addCustomObjects(scene) {
        this.customObjects.forEach(({ data }) => {
            const particleSystem = ParticleSystem.fromJSON(data);

            // Handle standard Object3D properties
            if (data.uuid) particleSystem.uuid = data.uuid;
            if (data.name) particleSystem.name = data.name;
            if (data.position) particleSystem.position.fromArray(data.position);
            if (data.rotation) particleSystem.rotation.fromArray(data.rotation);
            if (data.scale) particleSystem.scale.fromArray(data.scale);
            if (data.matrix) particleSystem.matrix.fromArray(data.matrix);
            if (data.visible !== undefined) particleSystem.visible = data.visible;
            if (data.userData) particleSystem.userData = data.userData;

            // Find the placeholder object by UUID and replace it
            const placeholder = scene.getObjectByProperty('uuid', data.uuid);
            if (placeholder && placeholder.parent) {
                const parent = placeholder.parent;
                const index = parent.children.indexOf(placeholder);
                parent.children[index] = particleSystem;
                particleSystem.parent = parent;
            }
        });
    }
}

export { CustomObjectLoader };