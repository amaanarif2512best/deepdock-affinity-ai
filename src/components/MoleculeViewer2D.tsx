
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";

interface MoleculeViewer2DProps {
  smiles: string;
  width?: number;
  height?: number;
}

const MoleculeViewer2D: React.FC<MoleculeViewer2DProps> = ({ 
  smiles, 
  width = 300, 
  height = 200 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moleculeData, setMoleculeData] = useState<any>(null);

  useEffect(() => {
    if (!smiles) return;

    const loadRDKit = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load RDKit from CDN
        if (!(window as any).RDKit) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js';
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });

          // Initialize RDKit
          await new Promise((resolve) => {
            (window as any).initRDKitModule().then((RDKit: any) => {
              (window as any).RDKit = RDKit;
              resolve(RDKit);
            });
          });
        }

        const RDKit = (window as any).RDKit;
        
        // Create molecule from SMILES
        const mol = RDKit.get_mol(smiles);
        if (!mol || !mol.is_valid()) {
          throw new Error('Invalid SMILES string');
        }

        // Generate 2D coordinates
        const molWithCoords = RDKit.get_mol(smiles);
        RDKit.prefer_coordgen(true);
        
        // Draw molecule to canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Generate SVG and convert to canvas
            const svg = molWithCoords.get_svg(width, height);
            const img = new Image();
            const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
              URL.revokeObjectURL(url);
            };
            img.src = url;
          }
        }

        // Calculate molecular properties
        const mw = mol.get_descriptors().AMW;
        const logp = mol.get_descriptors().CrippenClogP;
        const hbd = mol.get_descriptors().NumHBD;
        const hba = mol.get_descriptors().NumHBA;

        setMoleculeData({
          molecularWeight: mw.toFixed(2),
          logP: logp.toFixed(2),
          hbdCount: hbd,
          hbaCount: hba
        });

        mol.delete();
        molWithCoords.delete();
        setIsLoading(false);
      } catch (err) {
        console.error('RDKit error:', err);
        setError('Failed to generate 2D structure');
        setIsLoading(false);
        
        // Fallback: draw a simple placeholder
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#6b7280';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Unable to render', width/2, height/2 - 10);
            ctx.fillText('2D structure', width/2, height/2 + 10);
          }
        }
      }
    };

    loadRDKit();
  }, [smiles, width, height]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'molecule_2d.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <Card className="border border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-blue-800">2D Structure</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={isLoading || !!error}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <canvas 
            ref={canvasRef}
            width={width}
            height={height}
            className="border rounded bg-white w-full"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Generating structure...</div>
            </div>
          )}
        </div>

        {moleculeData && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">MW:</span>
              <Badge variant="secondary">{moleculeData.molecularWeight} Da</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">LogP:</span>
              <Badge variant="secondary">{moleculeData.logP}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">HBD:</span>
              <Badge variant="secondary">{moleculeData.hbdCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">HBA:</span>
              <Badge variant="secondary">{moleculeData.hbaCount}</Badge>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MoleculeViewer2D;
